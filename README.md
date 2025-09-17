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
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── customerController.js
│   │   └── retailerController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── userModel.js
│   │   ├── productModel.js
│   │   └── orderModel.js
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
