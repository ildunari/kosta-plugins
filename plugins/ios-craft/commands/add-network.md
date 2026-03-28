---
name: add-network
description: Set up a network layer for API integration
---

Use the ios-api-integration skill to set up a complete network layer.

Start by understanding the API:
- What API are you connecting to? (REST, GraphQL, or custom)
- Do you have the API documentation or base URL?
- What authentication does it use? (API key, OAuth, bearer token, none)
- What are the main endpoints you need to call?

Then build the network layer:

1. **API client** — Create a reusable network client using URLSession with async/await. Configure base URL, headers, authentication, and timeout.

2. **Request/Response models** — Define Codable structs for each endpoint's request and response. Use CodingKeys where API naming differs from Swift conventions.

3. **Error handling** — Create typed errors that map to HTTP status codes and network failures. Include user-facing error messages.

4. **Service layer** — Build service objects that wrap the API client for each feature area (UserService, ProductService, etc.).

5. **Testing** — Create mock services using protocols so views can be previewed and tested without hitting the real API.

6. **Integration** — Wire the services into the app's dependency injection and connect them to the views that need data.

Build and verify that at least one endpoint works end to end.
