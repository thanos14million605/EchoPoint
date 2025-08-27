# EchoPoint API

A blog post API that supports posts and comments, written with Node.js + PostgreSQL backend with authentication, authorization, and advanced query handling (filtering, sorting, pagination, field limiting).

Built with love by Ebrima Gajaga ❤️❤️❤️❤️

## Features

- Authentication & Authorization with JWT
- Role-based access control (`restrictTo`)
- PostgreSQL connection pooling
- Transactions with `BEGIN`, `COMMIT`, and `ROLLBACK`
- Global error handling with safe client release
- API query utilities:
  - Field limiting
  - Filtering
  - Sorting
  - Pagination

## Requirements

- Node.js (>= 18)
- PostgreSQL (>= 14)
- npm or yarn

## Installation

```bash
# clone the repo
git clone <your-repo-url>

# enter project directory
cd <your-project-name>

# install dependencies
npm install
```
