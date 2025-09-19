## Thrill Safari: The Ultimate Theme Park Ride Planner 
Thrill Safari is a dynamic full-stack web application designed to help theme park visitors generate an optimal ride plan based on their personal preferences. By inputting their available time, age, weight and other criteria, users receive a customized itinerary that maximizes their thrill experience. The application also features a secure admin panel for park staff to manage the ride database.

## Key Features

Optimal Plan Generation: Utilizes a heap-based algorithm in the backend to prioritize rides, maximizing the total "thrill" score within the user's time limit.

**Personalized User Preferences(Tailors the plan based on)**:

1. Total available time (hours and minutes).

2. User's age and weight (filtering out ineligible rides).

3. VIP access status (reduces queue times).

4. Current weather conditions (excludes weather-affected rides).

Advanced Ride Filtering: Supports preferences like "Dry Rides Only," "Wet Rides Only," or a "Dry First, Then Wet" sequence, respecting park safety rules.

Secure Admin Panel: A separate, login-protected section for administrators to add new rides to the park's database.

JWT Authentication: Employs JSON Web Tokens for securing admin-only API endpoints, ensuring that only authorized staff can modify ride data.

Dynamic Ride Display: Fetches and displays all available rides from the database, categorized into Land, Water, and Kids sections for easy browsing.

Responsive UI: Built with React and React-Bootstrap, the user interface is fully responsive and provides a seamless experience on both desktop and mobile devices.

## Technologies

**Frontend**:

React.js: A powerful JavaScript library for building user interfaces.

React-Bootstrap: For responsive and pre-styled UI components.

JavaScript (ES6+): For frontend logic and API communication.

CSS3: For custom styling and animations.

**Backend**:

Python: The core language for the server-side logic.

Flask: A lightweight web framework for building the REST API.

MySQL: The relational database used for storing ride and user data.

Flask-CORS: To handle Cross-Origin Resource Sharing between the frontend and backend.

Flask-Bcrypt: For hashing admin passwords securely.

PyJWT: For generating and validating JSON Web Tokens for authentication.

mysql-connector-python: The official driver for connecting the Flask app to the MySQL database.

Default Admin Credentials
Once the application is running, you can log in to the admin panel using the default credentials:

Staff ID: admin

Password: password123

## Future Enhancements
This project has a solid foundation, but there are many exciting features that could be added:

Full User Accounts: Allow regular users to sign up, save their favorite rides, and store their generated plans.

Edit & Delete Rides: Expand the admin panel to allow for updating and removing existing rides.

Interactive Park Map: Display the ride plan on a visual map of the theme park.

Real-time Queue Data: Integrate with a (mock or real) API to fetch live queue times for more accurate planning.

Ride Ratings & Reviews: Allow users to rate and review rides.













Tools

