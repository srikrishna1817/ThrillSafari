import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Spinner, Alert } from 'react-bootstrap';
import './App.css';

function App() {
  // State variables for user preferences
  const [totalHours, setTotalHours] = useState(''); // State for selected hours
  const [totalMinutes, setTotalMinutes] = useState(''); // State for selected minutes
  const [userAge, setUserAge] = useState('');
  const [userWeight, setUserWeight] = useState('');
  const [isVIP, setIsVIP] = useState(true);
  const [badWeather, setBadWeather] = useState(false);
  const [ridePreference, setRidePreference] = useState('');

  // State for managing rides and the generated plan
  const [rides, setRides] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // State for adding a new ride
  const [newRide, setNewRide] = useState({
      id: '',
      name: '',
      thrill: 5,
      duration: 3,
      queue_time: 15,
      fatigue: 5,
      mandatory: false,
      restricted: true,
      vip_access: true,
      affected_by_weather: true,
      type: 'land',
      min_weight: 0,
      max_weight: 200,
      min_age: 0,
      max_age: 100
  });

  // --- STATES FOR AUTHENTICATION ---
  const [staffIdInput, setStaffIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || null);
  const [userRole, setUserRole] = useState(localStorage.getItem('user_role') || 'guest');
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const isAdminLoggedIn = userRole === 'admin';
  // --- END NEW STATES ---

  // State for Kids Rides section visibility
  const [showKidsRidesSection, setShowKidsRidesSection] = useState(false);


  // Base URL for your Flask API
  const API_BASE_URL = 'http://127.0.0.1:5000/api';

  // Clear messages after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Fetch rides when component mounts and check API health
  useEffect(() => {
    fetchRides();
    checkAPIHealth();
    if (token) {
      try {
        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        setUserRole(decodedToken.role || 'guest');
      } catch (e) {
        console.error("Error decoding token from localStorage:", e);
        handleLogout();
      }
    }
  }, [token]);

  // Check if API is running
  const checkAPIHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log('API Health Check:', data);
        if (!data.db_connected) {
          setError('Warning: Database connection failed. Some features may not work properly.');
        }
      }
    } catch (err) {
      console.error('API Health Check failed:', err);
      setError('Cannot connect to backend server. Please ensure the Flask server is running on port 5000.');
    }
  };

  // Function to fetch all rides from the backend
  const fetchRides = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/rides`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setRides(data);
      console.log(`Loaded ${data.length} rides from backend`);
    } catch (err) {
      console.error("Error fetching rides:", err);
      setError(`Failed to load rides: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handler for input changes in the "Add New Ride" form
  const handleNewRideInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewRide((prevRide) => ({
      ...prevRide,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Validate new ride form
  const validateNewRide = () => {
      const { id, name, thrill, duration, queue_time, fatigue, type, min_weight, max_weight, min_age, max_age } = newRide;
      
      if (!id || !name || !thrill || !duration || queue_time === '' || !fatigue || !type) {
        return 'Please fill in all required fields.';
      }
      
      const idPrefix = id.substring(0, 1).toUpperCase();
      const idNumber = parseInt(id.substring(1));
      if (!['L', 'W', 'K'].includes(idPrefix) || isNaN(idNumber) || idNumber < 1) {
        return 'ID must start with L, W, or K followed by a number (e.g., L001, W002).';
      }

      const numThrill = parseInt(thrill);
      const numDuration = parseInt(duration);
      const numQueueTime = parseInt(queue_time);
      const numFatigue = parseInt(fatigue);
      const numMinWeight = parseInt(min_weight);
      const numMaxWeight = parseInt(max_weight);
      const numMinAge = parseInt(min_age);
      const numMaxAge = parseInt(max_age);
      
      if (isNaN(numThrill) || numThrill < 1 || numThrill > 10) return 'Thrill must be between 1 and 10.';
      if (isNaN(numDuration) || numDuration < 1) return 'Duration must be at least 1 minute.';
      if (isNaN(numQueueTime) || numQueueTime < 0) return 'Queue time cannot be negative.';
      if (isNaN(numFatigue) || numFatigue < 1 || numFatigue > 10) return 'Fatigue must be between 1 and 10.';
      if (isNaN(numMinWeight) || numMinWeight < 0) return 'Minimum weight cannot be negative.';
      if (isNaN(numMaxWeight) || numMaxWeight < 1) return 'Maximum weight must be at least 1 kg.';
      if (numMinWeight >= numMaxWeight) return 'Minimum weight must be less than maximum weight.';
      if (isNaN(numMinAge) || numMinAge < 0) return 'Minimum age cannot be negative.';
      if (isNaN(numMaxAge) || numMaxAge < 1) return 'Maximum age must be at least 1 year.';
      if (numMinAge >= numMaxAge) return 'Minimum age must be less than maximum age.';
      
      if (rides.some(ride => ride.id === id)) {
        return `Ride with ID ${id} already exists.`;
      }
      
      return null;
    };

  // Handler for adding a new ride
  const handleAddRide = async () => {
    setError(null);
    setSuccess(null);
    
    const validationError = validateNewRide();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!token) {
      setError('You must be logged in to add a ride.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/add_ride`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: newRide.id.trim(),
          name: newRide.name.trim(),
          thrill: parseInt(newRide.thrill),
          duration: parseInt(newRide.duration),
          queue_time: parseInt(newRide.queue_time),
          fatigue: parseInt(newRide.fatigue),
          mandatory: newRide.mandatory,
          restricted: newRide.restricted,
          vip_access: newRide.vip_access,
          affected_by_weather: newRide.affected_by_weather,
          type: newRide.type,
          min_weight: parseInt(newRide.min_weight),
          max_weight: parseInt(newRide.max_weight),
          min_age: parseInt(newRide.min_age),
          max_age: parseInt(newRide.max_age)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setSuccess(result.message || 'Ride added successfully!');
      
      setNewRide({
        id: '',
        name: '',
        thrill: 5,
        duration: 3,
        queue_time: 15,
        fatigue: 5,
        mandatory: false,
        restricted: true,
        vip_access: true,
        affected_by_weather: true,
        type: 'land',
        min_weight: 0,
        max_weight: 200,
        min_age: 0,
        max_age: 100
      });
      
      await fetchRides();
    } catch (err) {
      console.error("Error adding ride:", err);
      setError(`Failed to add ride: ${err.message}`);
      if (err.message.includes('Token') || err.message.includes('Forbidden')) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler for generating the optimal plan
  const handleGeneratePlan = async () => {
    setError(null);
    setSuccess(null);
    setPlan(null);

    // Parse hours and minutes from dropdowns
    const selectedHours = parseInt(totalHours);
    const selectedMinutes = parseInt(totalMinutes);

    if (selectedHours > 7) {
      setError('The park is open for 7 hours');
      return;
    }
    // Calculate total time in minutes, defaulting to 0 if not selected
    const totalTimeInMinutes = (isNaN(selectedHours) ? 0 : selectedHours * 60) + 
                               (isNaN(selectedMinutes) ? 0 : selectedMinutes);

    // Validate total time
    if (totalTimeInMinutes <= 0) {
      setError('Total available time must be greater than 0 minutes. Please select hours and minutes.');
      return;
    }
   
    // Validate other required fields
    if (userAge === '' || userWeight === '') {
      setError('Please enter Your Age and Your Weight before generating a plan.');
      return;
    }

    const parsedUserAge = parseInt(userAge);
    const parsedUserWeight = parseInt(userWeight);

    // Validate the parsed values
    if (isNaN(parsedUserAge) || parsedUserAge < 1 || parsedUserAge > 100) {
      setError('Age must be between 1 and 100 years.');
      return;
    }

    if (isNaN(parsedUserWeight) || parsedUserWeight < 10 || parsedUserWeight > 300) {
      setError('Weight must be between 10 and 300 kg.');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/generate_plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          total_time: totalTimeInMinutes,
          user_age: parsedUserAge,
          user_weight: parsedUserWeight,
          is_vip: isVIP,
          bad_weather: badWeather,
          ride_preference: ridePreference,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setPlan(data);
      
      if (data.selected_rides && data.selected_rides.length > 0) {
        setSuccess(`Plan generated successfully! ${data.selected_rides.length} rides selected.`);
      } else {
        setError('No rides could be scheduled with the current preferences. Try increasing your time or adjusting age/weight criteria.');
      }
    } catch (err) {
      console.error("Error generating plan:", err);
      setError(`Failed to generate plan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine thrill level text color
  const getThrillColorClass = (thrill) => {
    if (thrill >= 8) return 'text-danger';
    if (thrill >= 5) return 'text-warning';
    return 'text-success';
  };

  // Helper function to get ride type background color for plan display
  const getRideTypeColorClass = (type) => {
    switch(type) {
      case 'water':
        return 'table-info';
      case 'land':
        return 'table-success';  
      case 'kids':
        return 'table-warning';
      default:
        return '';
    }
  };

  // Helper function to get ride type icon
  const getRideTypeIcon = (type) => {
    switch(type) {
      case 'water':
        return '🌊';
      case 'land':
        return '🏔️';
      case 'kids':
        return '�';
      default:
        return '🎢';
    }
  };

  // --- ADMIN LOGIN / LOGOUT LOGIC ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: staffIdInput,
          password: passwordInput,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setToken(data.token);
      setUserRole(data.role);
      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('user_role', data.role);
      setSuccess(`Welcome, ${data.staff_id}! You are logged in as ${data.role}.`);
      setStaffIdInput('');
      setPasswordInput('');
    } catch (err) {
      console.error("Login failed:", err);
      setError(`Login failed: ${err.message}`);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserRole('guest');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    setSuccess('Logged out successfully.');
    setError(null);
  };
  // --- END ADMIN LOGIN / LOGOUT LOGIC ---

  // Filter rides by type for display
  const landRides = rides.filter(ride => ride.type === 'land');
  const waterRides = rides.filter(ride => ride.type === 'water');
  const kidsRides = rides.filter(ride => ride.type === 'kids');

  // Determine if user is a kid (e.g., age < 13) for conditional rendering
  const isKidUser = parseInt(userAge) < 13 && parseInt(userAge) >= 1;

  // Scroll functions for navigation
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };


  return (
    <div className="App">
      <Container className="my-5">
       <header className="text-center mb-5 position-relative">
          {/* Park Timings Banner */}
          <div className="park-timing-banner mb-4 p-3 bg-secondary text-white rounded-lg shadow-sm">
            <h4 className="mb-0 fw-bold">Park Timings: 11:00 AM - 6:00 PM</h4>
            <p className="mb-0 text-sm">Plan your adventure within these hours!</p>
          </div>

          {/* Changed title to Thrill Safari and updated tagline */}
          <h1 className="display-4 fw-bold text-primary">Thrill Safari</h1>
          <p className="lead text-secondary">Your ultimate adventure awaits!</p>
          
          {/* Admin Toggle Button */}
          <Button
            variant="outline-secondary"
            size="sm"
            className="position-absolute top-0 end-0 mt-2"
            onClick={() => setShowAdminPanel(!showAdminPanel)}
          >
            {showAdminPanel ? 'Hide Admin' : 'Show Admin'}
          </Button>
        </header>

        {/* Navigation Buttons */}
        <Row className="mb-4">
          <Col md={12}>
            <div className="d-flex justify-content-center gap-3 flex-wrap">
              <Button
                variant="outline-success"
                size="sm"
                className="custom-button-secondary"
                onClick={() => scrollToSection('land-rides-section')}
              >
                🏔️ Land Rides
              </Button>
              <Button
                variant="outline-info"
                size="sm"
                className="custom-button-secondary"
                onClick={() => scrollToSection('water-rides-section')}
              >
                🌊 Water Rides
              </Button>
              {isKidUser && (
                <Button
                  variant="outline-warning"
                  size="sm"
                  className="custom-button-secondary"
                  onClick={() => scrollToSection('kids-rides-section')}
                >
                  🎠 Kids Rides
                </Button>
              )}
              {plan && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="custom-button-secondary"
                  onClick={() => scrollToSection('optimal-plan-section')}
                >
                  🎢 My Plan
                </Button>
              )}
            </div>
          </Col>
        </Row>

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center my-4">
            <Spinner animation="border" variant="info" /> 
            <span className="text-info ms-2">Loading...</span>
          </div>
        )}

        {/* Error Messages */}
        {error && (
          <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
            <Alert.Heading>Error</Alert.Heading>
            {error}
          </Alert>
        )}

        {/* Success Messages */}
        {success && (
          <Alert variant="success" className="mb-4" dismissible onClose={() => setSuccess(null)}>
            <Alert.Heading>Success</Alert.Heading>
            {success}
          </Alert>
        )}

        <Row className="g-4">
          {/* User Preferences Section */}
          <Col md={showAdminPanel ? 6 : 12}>
            <Card className="shadow-lg custom-card">
              <Card.Body>
                <Card.Title className="text-center mb-4 text-info">Your Preferences</Card.Title>
                <Form>
                  {/* Consolidated Time Input */}
                  <Form.Group className="mb-3">
                    <Form.Label>Total Available Time *</Form.Label>
                    <Row className="g-2"> {/* Use g-2 for smaller gap */}
                      <Col xs={3}>
                        <Form.Control
                          as="select"
                          value={totalHours}
                          onChange={(e) => setTotalHours(e.target.value)}
                          className="custom-input"
                          required
                        >
                          <option value="">Hours</option>
                          {[...Array(8).keys()].map(i => ( // 0 to 8 hours
                            <option key={i} value={i}>{i} hr</option>
                          ))}
                        </Form.Control>
                      </Col>
                      <Col xs={3}>
                        <Form.Control
                          as="select"
                          value={totalMinutes}
                          onChange={(e) => setTotalMinutes(e.target.value)}
                          className="custom-input"
                          required
                        >
                          <option value="">Minutes</option>
                          {[0, 10, 20, 30, 40, 50].map(i => (
                            <option key={i} value={i}>{i} min</option>
                          ))}
                        </Form.Control>
                      </Col>
                    </Row>
                    <Form.Text className="text-muted mt-2">
                      Select your total available time.
                    </Form.Text>
                  </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Your Age (years) *</Form.Label>
                  <Form.Control
                    type="number"
                    value={userAge}
                    onChange={(e) => setUserAge(e.target.value)}
                    min="1"
                    max="100"
                    placeholder="Enter your age (e.g., 25)"
                    className="custom-input"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Your Weight (kg) *</Form.Label>
                  <Form.Control
                    type="number"
                    value={userWeight}
                    onChange={(e) => setUserWeight(e.target.value)}
                    min="10"
                    max="300"
                    placeholder="Enter your weight (e.g., 70)"
                    className="custom-input"
                    required
                  />
                </Form.Group>
                  {/* Ride Preference Selection */}
                  <Form.Group className="mb-3">
                    <Form.Label>Ride Preference</Form.Label>
                    <Form.Control
                      as="select"
                      value={ridePreference}
                      onChange={(e) => setRidePreference(e.target.value)}
                      className="custom-input"
                    >
                      <option value="">No Preference (Mixed)</option>
                      <option value="dry_only">Dry Rides Only (Land + Kids)</option>
                      <option value="wet_only">Wet Rides Only (Water)</option>
                      <option value="dry_first">Dry Rides First, Then Wet</option>
                    </Form.Control>
                    <Form.Text className="text-muted">
                      Note: After wet rides, management doesn't permit dry rides due to safety reasons.
                    </Form.Text>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Do you have VIP access?"
                      checked={isVIP}
                      onChange={(e) => setIsVIP(e.target.checked)}
                      className="custom-checkbox"
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Check
                      type="checkbox"
                      label="Is the weather bad today?"
                      checked={badWeather}
                      onChange={(e) => setBadWeather(e.target.checked)}
                      className="custom-checkbox"
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    onClick={handleGeneratePlan}
                    className="w-100 custom-button"
                    disabled={loading || userAge === '' || userWeight === '' || (totalHours === '' && totalMinutes === '')}
                  >
                    {loading ? 'Generating...' : 'Generate Optimal Plan'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Admin Login Section - Conditionally Rendered */}
          {showAdminPanel && (
            <Col md={6}>
              <Card className="shadow-lg custom-card">
                <Card.Body>
                  <Card.Title className="text-center mb-4 text-primary">Administrator Access</Card.Title>
                  {!token ? (
                    <Form onSubmit={handleLogin}>
                      <Form.Group className="mb-3">
                        <Form.Label>Staff ID</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Enter Staff ID"
                          value={staffIdInput}
                          onChange={(e) => setStaffIdInput(e.target.value)}
                          className="custom-input"
                          required
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                          type="password"
                          placeholder="Enter Password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="custom-input"
                          required
                        />
                      </Form.Group>
                      <Button
                        type="submit"
                        variant="success"
                        className="w-100 custom-button btn-success"
                        disabled={loading}
                      >
                        Login
                      </Button>
                    </Form>
                  ) : (
                    <div className="text-center">
                      <p className="text-success fw-bold">
                        Logged in as <span className="text-info">{userRole.toUpperCase()}</span>.
                      </p>
                      <Button
                        variant="danger"
                        onClick={handleLogout}
                        className="w-75 custom-button"
                      >
                        Logout
                      </Button>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>

        {/* Add New Ride Section - Conditionally rendered based on admin role */}
        {isAdminLoggedIn && ( // Only render if userRole is 'admin'
          <Row className="mt-4">
            <Col md={12}>
              <Card className="shadow-lg custom-card">
                <Card.Body>
                  <Card.Title className="text-center mb-4 text-success">Add New Ride</Card.Title>
                  <Form>
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Ride ID *</Form.Label>
                          <Form.Control
                            type="text" // Changed to text for L001, W001, K001
                            name="id"
                            placeholder="e.g., L001, W001, K001"
                            value={newRide.id}
                            onChange={handleNewRideInputChange}
                            className="custom-input"
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Ride Name *</Form.Label>
                          <Form.Control
                            type="text"
                            name="name"
                            placeholder="Enter ride name"
                            value={newRide.name}
                            onChange={handleNewRideInputChange}
                            className="custom-input"
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row className="mb-3">
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Thrill Level (1-10) *</Form.Label>
                          <Form.Control
                            type="number"
                            name="thrill"
                            placeholder="1-10"
                            value={newRide.thrill}
                            onChange={handleNewRideInputChange}
                            min="1" 
                            max="10"
                            className="custom-input"
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Duration (minutes) *</Form.Label>
                          <Form.Control
                            type="number"
                            name="duration"
                            placeholder="Duration in minutes"
                            value={newRide.duration}
                            onChange={handleNewRideInputChange}
                            min="1"
                            className="custom-input"
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Queue Time (minutes) *</Form.Label>
                          <Form.Control
                            type="number"
                            name="queue_time"
                            placeholder="Queue time in minutes"
                            value={newRide.queue_time}
                            onChange={handleNewRideInputChange}
                            min="0"
                            className="custom-input"
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row className="mb-3">
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Fatigue Level (1-10) *</Form.Label>
                          <Form.Control
                            type="number"
                            name="fatigue"
                            placeholder="1-10"
                            value={newRide.fatigue}
                            onChange={handleNewRideInputChange}
                            min="1" 
                            max="10"
                            className="custom-input"
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Ride Type *</Form.Label>
                          <Form.Control
                            as="select"
                            name="type"
                            value={newRide.type}
                            onChange={handleNewRideInputChange}
                            className="custom-input"
                            required
                          >
                            <option value="land">Land</option>
                            <option value="water">Water</option>
                            <option value="kids">Kids</option>
                          </Form.Control>
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row className="mb-4">
                      <Col xs={6} md={3}>
                        <Form.Check
                          type="checkbox"
                          name="mandatory"
                          label="Mandatory"
                          checked={newRide.mandatory}
                          onChange={handleNewRideInputChange}
                          className="custom-checkbox"
                        />
                      </Col>
                      <Col xs={6} md={3}>
                        <Form.Check
                          type="checkbox"
                          name="restricted"
                          label="Restricted"
                          checked={newRide.restricted}
                          onChange={handleNewRideInputChange}
                          className="custom-checkbox"
                        />
                      </Col>
                      <Col xs={6} md={3}>
                        <Form.Check
                          type="checkbox"
                          name="vip_access"
                          label="VIP Access"
                          checked={newRide.vip_access}
                          onChange={handleNewRideInputChange}
                          className="custom-checkbox"
                        />
                      </Col>
                      <Col xs={6} md={3}>
                        <Form.Check
                          type="checkbox"
                          name="affected_by_weather"
                          label="Weather Affected"
                          checked={newRide.affected_by_weather}
                          onChange={handleNewRideInputChange}
                          className="custom-checkbox"
                        />
                      </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Minimum Weight (kg)</Form.Label>
                            <Form.Control
                              type="number"
                              name="min_weight"
                              placeholder="Minimum weight required"
                              value={newRide.min_weight}
                              onChange={handleNewRideInputChange}
                              min="0"
                              className="custom-input"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Maximum Weight (kg)</Form.Label>
                            <Form.Control
                              type="number"
                              name="max_weight"
                              placeholder="Maximum weight allowed"
                              value={newRide.max_weight}
                              onChange={handleNewRideInputChange}
                              min="1"
                              className="custom-input"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Row className="mb-3">
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Minimum Age (years)</Form.Label>
                            <Form.Control
                              type="number"
                              name="min_age"
                              placeholder="Minimum age required"
                              value={newRide.min_age}
                              onChange={handleNewRideInputChange}
                              min="0"
                              className="custom-input"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Maximum Age (years)</Form.Label>
                            <Form.Control
                              type="number"
                              name="max_age"
                              placeholder="Maximum age allowed"
                              value={newRide.max_age}
                              onChange={handleNewRideInputChange}
                              min="1"
                              className="custom-input"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    <Button
                      variant="success"
                      onClick={handleAddRide}
                      className="w-100 custom-button"
                      disabled={loading}
                    >
                      {loading ? 'Adding Ride...' : 'Add Ride'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
       
        <br></br><br></br>

        {/* Optimal Plan Section */}
        {/* Optimal Plan Section */}
        {plan && (
          <Row className="mt-4" id="optimal-plan-section">
            <Col md={12}>
              <Card className="shadow-lg custom-card">
                <Card.Body>
                  <Card.Title className="text-center mb-4 text-warning">
                    🎢 Optimal Ride Plan
                  </Card.Title>
                  {plan.selected_rides && plan.selected_rides.length > 0 ? (
                    <>
                      {/* NEW: Legend for ride types */}
                      <div className="text-center mb-3">
                        <small className="text-muted">
                          <span className="badge bg-success me-2">🏔️ Land Rides</span>
                          <span className="badge bg-info me-2">🌊 Water Rides</span>
                          <span className="badge bg-warning">🎠 Kids Rides</span>
                        </small>
                      </div>
                      
                      <div className="table-responsive">
                        <Table striped bordered hover variant="dark" className="custom-table rounded-3 overflow-hidden">
                          <thead>
                            <tr>
                              <th>Order</th>
                              <th>Ride Name</th>
                              <th>Type</th>
                              <th>Thrill</th>
                              <th>Duration</th>
                              <th>Regular Queue</th>
                              <th>Your Queue Time</th>
                              <th>Total Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plan.selected_rides.map((ride, index) => (
                              <tr key={index} className={getRideTypeColorClass(ride.type)}>
                                <td className="fw-bold">{index + 1}</td>
                                <td className="fw-bold">{ride.name}</td>
                                <td className="text-center">
                                  {getRideTypeIcon(ride.type)} {ride.type.charAt(0).toUpperCase() + ride.type.slice(1)}
                                </td>
                                <td className={`${getThrillColorClass(ride.thrill)} fw-bold`}>{ride.thrill}</td>
                                <td>{ride.duration} min</td>
                                <td>{ride.queue_time} min</td>
                                <td className={plan.is_vip_used && ride.vip_queue_time < ride.queue_time ? 'text-success fw-bold' : ''}>
                                  {ride.vip_queue_time} min
                                  {plan.is_vip_used && ride.vip_queue_time < ride.queue_time && (
                                    <small className="d-block text-success">VIP Discount!</small>
                                  )}
                                </td>
                                <td className="fw-bold">{ride.duration + ride.vip_queue_time} min</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                      <div className="mt-4 text-center text-light">
                        <Row className="g-3">
                          <Col md={4}>
                            <div className="p-3 bg-success bg-opacity-25 rounded">
                              <h5 className="text-warning mb-1">Total Thrill</h5>
                              <p className="fs-4 fw-bold mb-0">{plan.total_thrill}</p>
                            </div>
                          </Col>
                          <Col md={4}>
                            <div className="p-3 bg-info bg-opacity-25 rounded">
                              <h5 className="text-warning mb-1">Rides Selected</h5>
                              <p className="fs-4 fw-bold mb-0">{plan.selected_rides.length}</p>
                            </div>
                          </Col>
                          <Col md={4}>
                            <div className="p-3 bg-warning bg-opacity-25 rounded">
                              <h5 className="text-warning mb-1">Time Remaining</h5>
                              <p className="fs-4 fw-bold mb-0">{plan.remaining_time} min</p>
                            </div>
                          </Col>
                        </Row>
                        
                        <hr className="my-4 border-secondary" />
                        <div className="text-muted">
                          <h6 className="fw-bold text-info">Plan Parameters Used:</h6>
                        <Row className="text-sm">
                        <Col md={3}>
                          <strong>Total Time:</strong> {plan.total_time_used} min
                        </Col>
                        <Col md={3}>
                          <strong>Age:</strong> {plan.user_age_used} yrs
                        </Col>
                        <Col md={3}>
                          <strong>Weight:</strong> {plan.user_weight_used} kg
                        </Col>
                        <Col md={3}>
                          <strong>VIP:</strong> {plan.is_vip_used ? 'Yes' : 'No'}
                        </Col>
                        <Col md={3}>
                          <strong>Weather:</strong> {plan.bad_weather_used ? 'Bad' : 'Good'}
                        </Col>
                      </Row>
                      {/* NEW: Display ride preference used */}
                      {plan.ride_preference_used && (
                        <Row className="text-sm mt-2">
                          <Col md={12} className="text-center">
                            <strong>Ride Preference:</strong> 
                            <span className="badge bg-secondary ms-2">
                              {plan.ride_preference_used === 'dry_only' && 'Dry Rides Only'}
                              {plan.ride_preference_used === 'wet_only' && 'Wet Rides Only'}  
                              {plan.ride_preference_used === 'dry_first' && 'Dry Rides First, Then Wet'}
                            </span>
                          </Col>
                        </Row>
                      )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted py-4">
                      <h5>No Optimal Plan Available</h5>
                      <p>No rides could be scheduled with your current preferences.</p>
                      <p><small>Try increasing your time limit, or adjusting age/weight criteria.</small></p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Categorized Rides Sections */}
        <Row className="mt-4 g-4">
          {/* Land Rides Section */}
          <Col md={12} id="land-rides-section">
            <Card className="shadow-lg custom-card">
              <Card.Body>
                <Card.Title className="text-center mb-4 text-info">
                  Land Rides ({landRides.length})
                </Card.Title>
                {landRides.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <p>No land rides available.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table striped bordered hover variant="dark" className="custom-table rounded-3 overflow-hidden">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Thrill</th>
                          <th>Duration</th>
                          <th>Queue</th>
                          <th>Fatigue</th>
                          <th>VIP</th>
                          <th>Weather</th>
                          <th>Restricted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {landRides.map((ride) => (
                          <tr key={ride.id}>
                            <td>{ride.id}</td>
                            <td className="fw-bold">{ride.name}</td>
                            <td className={getThrillColorClass(ride.thrill)}>{ride.thrill}</td>
                            <td>{ride.duration} min</td>
                            <td>{ride.queue_time} min</td>
                            <td>{ride.fatigue}</td>
                            <td>{ride.vip_access ? '✓' : '✗'}</td>
                            <td>{ride.affected_by_weather ? '✓' : '✗'}</td>
                            <td>{ride.restricted ? '✓' : '✗'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

        {/* Water Rides Section */}
          <Col md={12} id="water-rides-section">
            <Card className="shadow-lg custom-card">
              <Card.Body>
                <Card.Title className="text-center mb-4 text-info">
                  Water Rides ({waterRides.length})
                </Card.Title>
                {waterRides.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    <p>No water rides available.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table striped bordered hover variant="dark" className="custom-table rounded-3 overflow-hidden">
                     <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Thrill</th>
                          <th>Duration</th>
                          <th>Queue</th>
                          <th>Weight Limit</th>
                          <th>Age Limit</th>
                          <th>VIP</th>
                          <th>Weather</th>
                          <th>Restricted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waterRides.map((ride) => (
                          <tr key={ride.id}>
                          <td>{ride.id}</td>
                          <td className="fw-bold">{ride.name}</td>
                          <td className={getThrillColorClass(ride.thrill)}>{ride.thrill}</td>
                          <td>{ride.duration} min</td>
                          <td>{ride.queue_time} min</td>
                          <td>{ride.min_weight}-{ride.max_weight} kg</td>
                          <td>{ride.min_age}-{ride.max_age} yrs</td>
                          <td>{ride.vip_access ? '✓' : '✗'}</td>
                          <td>{ride.affected_by_weather ? '✓' : '✗'}</td>
                          <td>{ride.restricted ? '✓' : '✗'}</td>
                        </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Kids Rides Section */}
          {isKidUser && ( // Only show Kids Rides section if user is detected as a kid
            <Col md={12} id="kids-rides-section">
              <Card className="shadow-lg custom-card">
                <Card.Body>
                  <Card.Title className="text-center mb-4 text-info d-flex justify-content-center align-items-center">
                    Kids Rides ({kidsRides.length})
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="ms-3"
                      onClick={() => setShowKidsRidesSection(!showKidsRidesSection)}
                    >
                      {showKidsRidesSection ? '-' : '+'}
                    </Button>
                  </Card.Title>
                  {showKidsRidesSection && ( // Conditionally render content based on toggle
                    kidsRides.length === 0 ? (
                      <div className="text-center text-muted py-4">
                        <p>No kids rides available.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <Table striped bordered hover variant="dark" className="custom-table rounded-3 overflow-hidden">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Name</th>
                              <th>Thrill</th>
                              <th>Duration</th>
                              <th>Queue</th>
                              <th>Fatigue</th>
                              <th>VIP</th>
                              <th>Weather</th>
                              <th>Restricted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {kidsRides.map((ride) => (
                              <tr key={ride.id}>
                                <td>{ride.id}</td>
                                <td className="fw-bold">{ride.name}</td>
                                <td className={getThrillColorClass(ride.thrill)}>{ride.thrill}</td>
                                <td>{ride.duration} min</td>
                                <td>{ride.queue_time} min</td>
                                <td>{ride.fatigue}</td>
                                <td>{ride.vip_access ? '✓' : '✗'}</td>
                                <td>{ride.affected_by_weather ? '✓' : '✗'}</td>
                                <td>{ride.restricted ? '✓' : '✗'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )
                  )}
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>

      </Container>
    </div>
  );
}

export default App;
