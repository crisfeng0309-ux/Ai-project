import { listMarketCatalog, listAllCountries } from '../lib/market-constraints.mjs';

// GET /api/markets → 地区→国家两级目录，前端下拉用
export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({
    ok: true,
    data: {
      regions: listMarketCatalog(),
      countries: listAllCountries()
    }
  });
}
