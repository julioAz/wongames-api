/**
 * game service
 */

import axios from 'axios';
import { factories } from '@strapi/strapi';
import { JSDOM } from 'jsdom'
import slugify from 'slugify'
import { resourceLimits } from 'worker_threads';

async function getGameInfo(slug) {
  const gogSlug = slug.replaceAll('-', '_').toLowerCase();

  const body = await axios.get(`https://www.gog.com/game/${gogSlug}`);
  const dom = new JSDOM(body.data)
  const raw_description = dom.window.document.querySelector('.description')
  const description = raw_description.innerHTML
  const shortDescription = raw_description.textContent.slice(0, 160)
  const ratingElement = dom.window.document.querySelector(
    ".age-restrictions__icon use"
  );

  return {
    description,
    shortDescription,
    rating: ratingElement
      ? ratingElement
        .getAttribute("xlink:href")
        .replace(/_/g, "")
        .replace("#", "") : "BR0"
  }
}

async function getByName(name, entityService) {
  const item = await strapi.service(entityService).find({
    filters: { name }
  })

  return item.results.length > 0 ? item.results[0] : null;
}

async function create(name, entityService) {
  const item = await getByName(name, entityService)
  if (item) {
    await strapi.service(entityService).create({
      data: {
        name,
        slug: slugify(name, { strict: true, lower: true }),
      }
    })
  }
}

export default factories.createCoreService('api::game.game', () => ({
  async populate(params) {
    const gogApiUrl = `https://www.gog.com/games/ajax/filtered?mediaType=game?sort=rating`;
    const {
      data: { products },
    } = await axios.get(gogApiUrl);

    products[0].developers.map(async (developer) => {
      await create(developer, "api::developer.developer")
    });

    products[0].publishers.map(async (publisher) => {
      await create(publisher, "api::publisher.publisher")
    });

    products[0].genres.map(async ({name}) => {
      await create(name, "api::category.category")
    });
  }
}));
