# Node.js Backend with Express, TypeScript, Prisma ORM, and Zod

A modern Node.js backend API built with Express, TypeScript, Prisma ORM, and Zod for validation.

## Features

- TypeScript for type safety
- Express as the HTTP framework
- Prisma ORM for database operations
- Zod for input validation
- JWT authentication
- Error handling middleware
- Request logging
- ESLint for code quality

## Project Structure

```
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── prisma/             # Prisma client
│   ├── routes/             # API routes
│   ├── schemas/            # Zod validation schemas
│   ├── services/           # Business logic
│   └── index.ts            # App entry point
├── .env                    # Environment variables
├── .eslintrc.json         # ESLint configuration
├── .gitignore             # Git ignore file
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Copy the `.env.example` file to `.env` and update the values as needed.

4. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

### Development

Start the development server:

```bash
npm run dev
```

### Build and Production

Build the project:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login user

### Users

- `POST /api/users` - Register a new user

## Database

By default, the project uses SQLite for development. You can switch to PostgreSQL by updating the `DATABASE_URL` in the `.env` file and uncommenting the PostgreSQL provider in `prisma/schema.prisma`.

## License

ISC