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

### Web Dashboard

The webdashboard is used by employees / managers on-site. It works as an intranet app and allows associates to perform full CRUD operations on items, including their quantities. Managers have specialized permissions to create and edit their store's map.

### Private Routes

| Endpoint                                      | Method | Body                                                                                                                                                   | Action                                                                          |
|-----------------------------------------------|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------|
| /logs?action=&sku=&from=&to=&page=&=pageSize= | GET    | N/A                                                                                                                                                    | Gets a log of all operations performed. Filterable through query params.        |
| /health                                       | GET    | N/A                                                                                                                                                    | Get the current status of the database.                                         |
| /items                                        | POST   | { sku, name, price, quantity, shelfId, imageUrl }                                                                                                      | Create an item.                                                                 |
| /items/:sku                                   | PATCH  | { name, price, quantity, imageUrl }                                                                                                                    | Edit an item.                                                                   |
| /items/:sku                                   | DELETE | N/A                                                                                                                                                    | Delete an item with the given sku.                                              |
| /items/batch-delete                           | POST   | { skus: [...] }                                                                                                                                        | Delete multiple items.                                                          |
| /items/:sku/location                          | PATCH  | { shelfId }                                                                                                                                            | Moves a single item to a different shelf.                                       |
| /manager/unlock                               | POST   | { code }                                                                                                                                               | requires the manager's code, returns a short-lived manager token                |
| /manager/lock (*)                             | POST   | N/A                                                                                                                                                    | Deletes manager token and drops manager privileges.                             |
| /map (*)                                      | GET    | N/A                                                                                                                                                    | Fetch the most up to date map.                                                  |
| /map (*)                                      | PUT    | { storeId, editedBy, editedAt, status, baseVersion, version, units, sections: [ { id, name, color, polygon: [....], aisles: [... shelves: [...]] } ] } | Save the map to the database, baseVersion should be current version or greater. |

*\* requires a manager token to access*

### Mobile Application

The mobile app is used by customers, and displays the items along with a map. The map shows where item's are to the user and can show where every item on their list is. Users also have the option to create and sign into accounts to allow for lists to persist accross devices.

#### Public Routes

| Endpoint                    | Method | Body                          | Action                                                                                                  |
|-----------------------------|--------|-------------------------------|---------------------------------------------------------------------------------------------------------|
| /items/search?name=&page=&pgSize=  | GET    | N/A                           | Search the items database by name. Paginates the output, page size default is 25.          |
| /items/suggest?name=&limit= | GET    | N/A                           | Lightweight autocomplete for item's by name. Get as many items as the limit says. (default limit is 10). |
| /items/lookup               | POST   | {skus: [...]}                 | Returns a list of items from a list of SKUs.                                                            |
| /map                        | GET    | N/A                           | Get most recent version of the published map.                                                           |
| /map/version                | GET    | N/A                           | Get the most recent map's version number.                                                               |
| /auth/register              | POST   | {email, firstName, lastName,} | Begins registartion process. Sends an code to provided email.                                |
| /auth/login                 | POST   | {email}                       | Sends an SMS code for user login.                                                                       |
| /auth/verify                | POST   | {email, code}                 | Returns a session token.                                                                                |
| /auth/logout                | POST   | {tokenHash}                   | Invalidates user's session token.                                                                       |
| /me/list                    | GET    | {tokenHash}                   | Fetch saved list using the bearer token.                                                                |
| /me/list                    | PUT    | {tokenHash}                   | Replace the list when a user updates their list.                                                        |