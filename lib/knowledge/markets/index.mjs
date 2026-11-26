// 地区 → 国家 两级市场目录（聚合入口）
// 用法：import { REGIONS, findCountry, findRegion, listCatalog } from './markets/index.mjs'
import { REGION as northAmerica } from './north-america.mjs';
import { REGION as latam } from './latam.mjs';
import { REGION as oceania } from './oceania.mjs';
import { REGION as europe } from './europe.mjs';
import { REGION as russia } from './russia.mjs';
import { REGION as middleEast } from './middle-east.mjs';
import { REGION as eastAsia } from './east-asia.mjs';
import { REGION as southeastAsia } from './southeast-asia.mjs';

const RAW_REGIONS = [northAmerica, latam, oceania, europe, russia, middleEast, eastAsia, southeastAsia];

export const REGIONS = RAW_REGIONS
  .slice()
  .sort((a, b) => (a.order || 0) - (b.order || 0))
  .map((region) => ({
    ...region,
    countries: Object.entries(region.countries || {}).map(([id, country]) => ({
      ...country,
      id: country.id || id,
      regionId: region.id,
      regionName: region.name
    }))
  }));

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((region) => [region.id, region]));

export const COUNTRIES = REGIONS.flatMap((region) => region.countries);

export const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map((country) => [country.id, country]));

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** 按国家 id / 中文名 / 英文名 / 别名查找国家（返回带 region 信息的国家对象） */
export function findCountry(query) {
  const key = normalize(query);
  if (!key) return null;
  if (COUNTRY_BY_ID[key.toUpperCase()]) return COUNTRY_BY_ID[key.toUpperCase()];
  return (
    COUNTRIES.find((country) => {
      if (normalize(country.name) === key) return true;
      if (normalize(country.id) === key) return true;
      return (country.aliases || []).some((alias) => normalize(alias) === key);
    }) || null
  );
}

/** 按地区 id / 中文名 / 英文名 / 别名查找地区 */
export function findRegion(query) {
  const key = normalize(query);
  if (!key) return null;
  return (
    REGIONS.find((region) => normalize(region.id) === key || normalize(region.name) === key || (region.aliases || []).some((alias) => normalize(alias) === key)) || null
  );
}

/** 前端二级联动用的精简目录：[{ id, name, countries: [{ id, name, langs, currency }] }] */
export function listCatalog() {
  return REGIONS.map((region) => ({
    id: region.id,
    name: region.name,
    countries: region.countries.map((country) => ({
      id: country.id,
      name: country.name,
      aliases: country.aliases || [],
      langs: [country.lang?.code, ...(country.extraLangs || []).map((lang) => lang.code)].filter(Boolean),
      currency: country.currency?.code
    }))
  }));
}

export { RAW_REGIONS };
