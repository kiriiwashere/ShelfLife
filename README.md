# ShelfLife
A simple lighweight inventory managment system with inventory forecasting built with node.js and javascript. It features a custom JSON based database, JWT authentication and an intelligent forecasting engine that estimates supply depletion based on historical usage trends.  

## Features
- Predictive forecasting: Analyzes historical transaction logs to estimate when items run out of stock
- Data visualization: Interactive chart providing insight to usage trends, category distributions, and lifespan estimates
- Role based access control: JWT based authentication separating standard user operation from admin configurations
- Zero dependency database: Uses a custom JSON file system to handle concurrent read/writes without requiring a external database server

## Prerequisites
- [Node.js](https://nodejs.org/) (v16.0.0 or higher)

## Installation
1. Clone the repository
2. Run install script to configure environment and will be prompted to choose between demo and produciton environment
3. Run start script to start the server. The web interface will automatically open to your default browser

## Screenshot
<img width="2423" height="1254" alt="1" src="https://github.com/user-attachments/assets/5fe4449b-9cc8-46a0-8f63-a93aaf1c3121" />
<img width="2433" height="1262" alt="2" src="https://github.com/user-attachments/assets/6001d6bc-aceb-4b07-9977-e749dbc77e42" />
<img width="2430" height="1247" alt="4" src="https://github.com/user-attachments/assets/e9a33f0e-291e-47fd-986a-23d869bc60a3" />
<img width="2428" height="1265" alt="3" src="https://github.com/user-attachments/assets/d314dadd-072e-46cf-afa4-f1ebaacffd55" />
