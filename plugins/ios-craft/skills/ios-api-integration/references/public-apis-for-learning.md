# Public APIs for Learning iOS Networking

8 beginner-friendly, free APIs you can use to practice building network layers. Each one works without complicated setup. Listed from simplest to most full-featured.

---

## 1. JSONPlaceholder

The training wheels API. Fake data for testing, no auth, no rate limits, instant responses.

- **Base URL:** `https://jsonplaceholder.typicode.com`
- **Auth:** None
- **Rate Limits:** None (but be reasonable)

### Example Endpoints

**GET all posts:**
```
GET /posts
```
```json
[
  {
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere repellat provident occaecati",
    "body": "quia et suscipit\nsuscipit recusandae..."
  }
]
```

**GET single post:**
```
GET /posts/1
```

**POST create a post** (faked — returns the object with an ID but doesn't actually save):
```
POST /posts
Content-Type: application/json

{"title": "My Post", "body": "Hello world", "userId": 1}
```
```json
{
  "id": 101,
  "title": "My Post",
  "body": "Hello world",
  "userId": 1
}
```

**Other resources:** `/comments`, `/albums`, `/photos`, `/todos`, `/users`

**Best for:** Your very first networking code. Start here.

---

## 2. Dog API

Pictures of dogs. Simple, fun, zero auth.

- **Base URL:** `https://dog.ceo/api`
- **Auth:** None
- **Rate Limits:** None

### Example Endpoints

**GET random dog image:**
```
GET /breeds/image/random
```
```json
{
  "message": "https://images.dog.ceo/breeds/labrador/n02099712_4323.jpg",
  "status": "success"
}
```

**GET images by breed:**
```
GET /breed/labrador/images/random/3
```
```json
{
  "message": [
    "https://images.dog.ceo/breeds/labrador/n02099712_1.jpg",
    "https://images.dog.ceo/breeds/labrador/n02099712_2.jpg",
    "https://images.dog.ceo/breeds/labrador/n02099712_3.jpg"
  ],
  "status": "success"
}
```

**GET all breeds:**
```
GET /breeds/list/all
```

**Best for:** Practicing image loading with `AsyncImage`. Fun to demo.

---

## 3. REST Countries

Information about every country. Rich data, no auth needed.

- **Base URL:** `https://restcountries.com/v3.1`
- **Auth:** None
- **Rate Limits:** None

### Example Endpoints

**GET all countries:**
```
GET /all?fields=name,capital,population,flags,region
```
```json
[
  {
    "name": { "common": "Germany", "official": "Federal Republic of Germany" },
    "capital": ["Berlin"],
    "population": 83240525,
    "flags": { "png": "https://flagcdn.com/w320/de.png" },
    "region": "Europe"
  }
]
```

**Search by name:**
```
GET /name/germany
```

**Filter by region:**
```
GET /region/europe?fields=name,capital,population
```

**Best for:** Practicing search, filtering, and displaying rich data with images (flags).

---

## 4. PokeAPI

Detailed data about every Pokemon. Huge dataset, deeply nested JSON, great for practicing Codable with complex models.

- **Base URL:** `https://pokeapi.co/api/v2`
- **Auth:** None
- **Rate Limits:** 100 requests/IP/minute (generous)

### Example Endpoints

**GET list of Pokemon (paginated):**
```
GET /pokemon?limit=20&offset=0
```
```json
{
  "count": 1302,
  "next": "https://pokeapi.co/api/v2/pokemon?offset=20&limit=20",
  "previous": null,
  "results": [
    { "name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon/1/" },
    { "name": "ivysaur", "url": "https://pokeapi.co/api/v2/pokemon/2/" }
  ]
}
```

**GET single Pokemon:**
```
GET /pokemon/pikachu
```
```json
{
  "id": 25,
  "name": "pikachu",
  "height": 4,
  "weight": 60,
  "sprites": {
    "front_default": "https://raw.githubusercontent.com/.../25.png"
  },
  "types": [
    { "slot": 1, "type": { "name": "electric", "url": "..." } }
  ],
  "stats": [
    { "base_stat": 35, "stat": { "name": "hp" } },
    { "base_stat": 55, "stat": { "name": "attack" } }
  ]
}
```

**Best for:** Practicing pagination, nested Codable models, and building detail views.

---

## 5. OpenWeather API

Real weather data for any location. Requires a free API key.

- **Base URL:** `https://api.openweathermap.org/data/2.5`
- **Auth:** API key as query parameter (`appid=YOUR_KEY`)
- **Rate Limits:** 60 calls/minute on free tier, 1,000,000 calls/month
- **Sign up:** https://openweathermap.org/api (free tier, key activates in ~10 minutes)

### Example Endpoints

**GET current weather:**
```
GET /weather?q=London&units=metric&appid=YOUR_KEY
```
```json
{
  "name": "London",
  "main": {
    "temp": 15.2,
    "feels_like": 14.8,
    "humidity": 72
  },
  "weather": [
    {
      "main": "Clouds",
      "description": "overcast clouds",
      "icon": "04d"
    }
  ],
  "wind": { "speed": 3.6 }
}
```

**GET 5-day forecast:**
```
GET /forecast?q=London&units=metric&appid=YOUR_KEY
```

**Weather icon URL:**
```
https://openweathermap.org/img/wn/04d@2x.png
```

**Best for:** Practicing API key authentication, location-based data, and building a real utility app.

---

## 6. TMDb (The Movie Database)

Movies, TV shows, actors. Rich media, images, search. Requires a free API key.

- **Base URL:** `https://api.themoviedb.org/3`
- **Auth:** Bearer token in header OR `api_key` query parameter
- **Rate Limits:** 40 requests/10 seconds
- **Sign up:** https://www.themoviedb.org/settings/api (free, instant)

### Example Endpoints

**GET trending movies:**
```
GET /trending/movie/week?api_key=YOUR_KEY
```
```json
{
  "page": 1,
  "total_pages": 500,
  "total_results": 10000,
  "results": [
    {
      "id": 550,
      "title": "Fight Club",
      "overview": "A ticking-Loss insomnia...",
      "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      "vote_average": 8.4,
      "release_date": "1999-10-15"
    }
  ]
}
```

**Image base URL:** `https://image.tmdb.org/t/p/w500` + `poster_path`

**Search movies:**
```
GET /search/movie?query=inception&api_key=YOUR_KEY
```

**GET movie details:**
```
GET /movie/550?api_key=YOUR_KEY
```

**Best for:** Building a movie browser app. Practices search, pagination, image loading, and detail views.

---

## 7. NewsAPI

Real news articles from thousands of sources. Requires a free API key.

- **Base URL:** `https://newsapi.org/v2`
- **Auth:** API key in header (`X-Api-Key: YOUR_KEY`) or query param
- **Rate Limits:** 100 requests/day on free tier (developer plan)
- **Sign up:** https://newsapi.org/register (free, instant)
- **Note:** Free tier only works from localhost/development; production requires a paid plan

### Example Endpoints

**GET top headlines:**
```
GET /top-headlines?country=us&category=technology
X-Api-Key: YOUR_KEY
```
```json
{
  "status": "ok",
  "totalResults": 38,
  "articles": [
    {
      "source": { "id": "techcrunch", "name": "TechCrunch" },
      "author": "Sarah Perez",
      "title": "Apple announces new features...",
      "description": "Apple today announced...",
      "url": "https://techcrunch.com/...",
      "urlToImage": "https://techcrunch.com/image.jpg",
      "publishedAt": "2025-06-15T14:30:00Z"
    }
  ]
}
```

**Search everything:**
```
GET /everything?q=swift+programming&sortBy=publishedAt
X-Api-Key: YOUR_KEY
```

**Best for:** Building a news reader. Practices header-based auth, date parsing, and opening URLs in Safari.

---

## 8. SpaceX API

Open data about SpaceX launches, rockets, and crew. No auth, well-structured, actively maintained.

- **Base URL:** `https://api.spacexdata.com/v5`
- **Auth:** None
- **Rate Limits:** 50 requests/second

### Example Endpoints

**GET latest launch:**
```
GET /launches/latest
```
```json
{
  "id": "62dd70d5202306255024d139",
  "name": "CRS-26",
  "date_utc": "2022-11-26T19:20:00.000Z",
  "success": true,
  "details": "SpaceX's 26th resupply mission...",
  "links": {
    "patch": {
      "small": "https://imgur.com/BrW201S.png"
    },
    "webcast": "https://youtu.be/..."
  },
  "rocket": "5e9d0d95eda69973a809d1ec"
}
```

**GET all launches (paginated via POST query):**
```
POST /launches/query
Content-Type: application/json

{
  "query": { "success": true },
  "options": {
    "limit": 10,
    "page": 1,
    "sort": { "date_utc": "desc" }
  }
}
```
```json
{
  "docs": [ ... ],
  "totalDocs": 205,
  "page": 1,
  "totalPages": 21,
  "hasNextPage": true,
  "nextPage": 2
}
```

**GET all rockets:**
```
GET /rockets
```

**Best for:** Practicing complex queries (POST-based pagination), date handling, and building a visually rich app with mission patches and rocket images.

---

## Quick Comparison

| API | Auth | Rate Limit | Complexity | Best For |
|-----|------|-----------|------------|----------|
| JSONPlaceholder | None | None | Very simple | First network call ever |
| Dog API | None | None | Simple | Image loading practice |
| REST Countries | None | None | Medium | Search and filtering |
| PokeAPI | None | 100/min | Medium-High | Nested models, pagination |
| OpenWeather | API key (query) | 60/min | Medium | API key auth, real utility |
| TMDb | API key (header) | 40/10s | Medium-High | Full app with search + images |
| NewsAPI | API key (header) | 100/day | Medium | Header auth, date parsing |
| SpaceX | None | 50/sec | High | POST queries, complex models |

**Suggested learning path:** Start with JSONPlaceholder to get your `APIClient` working, then move to Dog API or REST Countries for images and search, then graduate to TMDb or SpaceX for a full-featured app.
