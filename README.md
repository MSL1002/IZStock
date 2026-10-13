# IZStock

## What is IZStock?

IZStock is, primarily, a mobile app aimed at helping shoppers find what they need in a grocery store. Instead of wandering aisles or asking associates for help, IZStock allows customers to look at a map of the store and pinpoint exactly where somethign is. The IZStock suite also include a web dashboard for employees and management that runs as an intranet app and allows for staff to manage items and the map.

## How Does IZStock Work?

IZStock has 3 main componenets to it:

1. Backend

2. Web Dashboard

3. Mobile Application

### Backend

The IZStock backend is seperated into 2 distinct parts, publicly accessible routes and private routes. Publicly accessible routes are hosted so that anyone, no matter where they are, can access and hit them. Private routes, are only accessible on-site through the private network of the business.

#### Public Routes

| Endpoint                    | Method | Body                          | Action                                                                                                  |
|-----------------------------|--------|-------------------------------|---------------------------------------------------------------------------------------------------------|
| /items/search?name=&limit=  | GET    | N/A                           | Search the items database by name. Get as many items as the limit says. (default limit is 20).          |
| /items/suggest?name=&limit= | GET    | N/A                           | Lightweight autocomplete for item's by name. Get as many items as the limit says. (default limit is 10). |
| /items/lookup               | POST   | {skus: [...]}                 | Returns a list of items from a list of SKUs.                                                            |
| /map                        | GET    | N/A                           | Get most recent version of the published map.                                                           |
| /map/version                | GET    | N/A                           | Get the most recent map's version number.                                                               |
| /auth/register              | POST   | {phone, firstName, lastName,} | Begins registartion process. Sends an SMS code to provided phone number.                                |
| /auth/login                 | POST   | {phone}                       | Sends an SMS code for user login.                                                                       |
| /auth/verify                | POST   | {phone, code}                 | Returns a session token.                                                                                |
| /auth/logout                | POST   | {tokenHash}                   | Invalidates user's session token.                                                                       |
| /me/list                    | GET    | {tokenHAsh}                   | Fetch saved list using the bearer token.                                                                |
| /me/list                    | PUT    | {tokenHash}                   | Replace the list when a user updates their list.                                                        |

### Web Dashboard

The webdashboard is used by employees / managers on-site. It works as an intranet app and allows associates to perform full CRUD operations on items, including their quantities. Managers have specialized permissions to create and edit their store's map.

### Private Routes

### Mobile Application