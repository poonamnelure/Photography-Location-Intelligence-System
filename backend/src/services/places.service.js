import axios from 'axios'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchPlacesByCategory = async ({lat, lng, radius, category, apikey}) => {
    const allResults = []
    const baseUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"

    const effectiveRadius = Math.min(radius, 50000)

    let url = `${baseUrl}?location=${lat},${lng}&radius=${effectiveRadius}&type=${category}&key=${apikey}`;

    try {

    // First page
    let response = await axios.get(url);
    allResults.push(...response.data.results);

    console.log("Google response:", response.data);

    // Pagination (max 2 extra pages)
    let nextPageToken = response.data.next_page_token;

    let pageCount = 0;

    return allResults;

  } catch (error) {
    console.error("Places API error:", error.message);
    return [];
  }
};
