# BitsKart
Course Project for CS F13. 

(Tentative project structure, can and will change as time passes and we keep failing)

```text
BitsKart/
├── .github/
│   └── workflows/
│       └── node.js.yml
├── backend/
│   ├── config/
│   │   └── db.js
|   ├── core/
|   │   ├── BaseController.js  # Common controller utilities
|   │   ├── BaseService.js     # Common service utilities
|   │   └── ApiError.js        # Custom error handling class
│   ├── controllers/           #Classes that handle requests/responses
│   │   ├── AuthController.js
│   │   ├── CustomerController.js
│   │   └── RetailerController.js
│   ├── middleware/
│   │   └── AuthMiddleware.js
│   ├── models/                 # Define Database Schemas (Objects in DB)
│   │   ├── User.js             # User Class via Mongoose
│   │   ├── Product.js
│   │   └── Order.js
|   ├── repositories/           #Classes that handle DB operations for a model
|   │   ├── UserRepository.js
|   │   ├── ProductRepository.js
|   │   └── OrderRepository.js
|   ├── services/               #Classes that contain business logic
|   │   ├── AuthService.js
|   │   ├── CustomerService.js
|   │   └── RetailerService.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── customerRoutes.js
│   │   └── retailerRoutes.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── api/
│   │   │   ├── customerService.js
│   │   │   └── retailerService.js
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── Customer/
│   │   │   │   └── HomePage.js
│   │   │   └── Retailer/
│   │   │       └── Dashboard.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── .gitignore
├── LICENSE
└── README.md
