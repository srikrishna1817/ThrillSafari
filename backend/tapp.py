import time
import os
import heapq
import mysql.connector
from mysql.connector import Error
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps
from dotenv import load_dotenv

# Flask Setup
app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)
load_dotenv()   # environment variables

# JWT Configuration 
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_super_secret_jwt_key_here_please_change_me')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES_HOURS', 1)))

# Color Definitions (for console output)
COLOR_RESET = "\x1B[0m"
COLOR_RED = "\x1B[31m"
COLOR_GREEN = "\x1B[32m"
COLOR_YELLOW = "\x1B[33m"
COLOR_BLUE = "\x1B[34m"
COLOR_MAGENTA = "\x1B[35m"
COLOR_CYAN = "\x1B[36m"
COLOR_WHITE = "\x1B[37m"
BOLD = "\x1B[1m"
UNDERLINE = "\x1B[4m"

# DB Configuration
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'database': os.environ.get('DB_NAME', 'theme_park_db'),
    'user': os.environ.get('DB_USER', 'root'),
    'password': os.environ.get('DB_PASSWORD', 'sql##123'),
    'port': int(os.environ.get('DB_PORT', 3306))
}

# Model Classes
class Ride:
    # Represents a single ride in the theme park with its attributes
    def __init__(self, id, name, thrill, duration, queue_time, fatigue, mandatory, restricted, vip_access,
                  affected_by_weather, type, min_weight=0, max_weight=200, min_age=0, max_age=100):
        self.id = id
        self.name = name
        self.thrill = thrill
        self.duration = duration
        self.queue_time = queue_time
        self.fatigue = fatigue
        self.mandatory = mandatory
        self.restricted = restricted
        self.vip_access = vip_access
        self.affected_by_weather = affected_by_weather
        self.type = type
        self.min_weight = min_weight
        self.max_weight = max_weight
        self.min_age = min_age
        self.max_age = max_age

class ParkModel:
    # Manages the overall theme park state, like rides,user preferences
    def __init__(self, total_time, is_vip, bad_weather, user_age=25, user_weight=70): 
        self.rides = []
        self.ride_count = 0
        self.total_time = total_time
        self.is_vip = is_vip
        self.bad_weather = bad_weather
        self.user_age = user_age
        self.user_weight = user_weight
        self.db_connection = None
        self._connect_db()
        self._create_tables()
        self.load_rides_from_db()

    def _connect_db(self):
        # Establishes a connection to the MySQL database.
        try:
            self.db_connection = mysql.connector.connect(**DB_CONFIG)
            if self.db_connection.is_connected():
                print(f"{COLOR_GREEN}Successfully connected to MySQL database.{COLOR_RESET}")
        except Error as e:
            print(f"{COLOR_RED}Error connecting to MySQL database: {e}{COLOR_RESET}")
            self.db_connection = None

    def _create_tables(self):
        if not self.db_connection:
            print(f"{COLOR_RED}Cannot create tables: No database connection.{COLOR_RESET}")
            return
        cursor = self.db_connection.cursor()
        
        # Define table schemas for rides
        ride_table_schema = """
        (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        thrill INT NOT NULL,
        duration INT NOT NULL,
        queue_time INT NOT NULL,
        fatigue INT NOT NULL,
        mandatory BOOLEAN NOT NULL,
        restricted BOOLEAN NOT NULL,
        vip_access BOOLEAN NOT NULL,
        affected_by_weather BOOLEAN NOT NULL,
        min_weight INT DEFAULT 0,
        max_weight INT DEFAULT 200,
        min_age INT DEFAULT 0,
        max_age INT DEFAULT 100
        )
        """
        
        # users table
        create_users_table_query = """
        CREATE TABLE IF NOT EXISTS users (
            staff_id VARCHAR(50) PRIMARY KEY,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'guest'
        )
        """
        
        try:
            cursor.execute("DROP TABLE IF EXISTS rides")
            self.db_connection.commit()
            print(f"{COLOR_YELLOW}Old 'rides' table dropped (if existed).{COLOR_RESET}")
            # Create new ride type tables
            cursor.execute(f"CREATE TABLE IF NOT EXISTS land_rides {ride_table_schema}")
            cursor.execute(f"CREATE TABLE IF NOT EXISTS water_rides {ride_table_schema}")
            cursor.execute(f"CREATE TABLE IF NOT EXISTS kids_rides {ride_table_schema}")
            
            cursor.execute(create_users_table_query)
            self.db_connection.commit()
            print(f"{COLOR_GREEN}Land, Water, Kids, and Users tables checked/created successfully.{COLOR_RESET}")
        except Error as e:
            print(f"{COLOR_RED}Error creating tables: {e}{COLOR_RESET}")
        finally:
            cursor.close()

    def add_ride(self, id, name, thrill, duration, queue_time, fatigue, mandatory, restricted, vip_access, 
                 affected_by_weather, type, min_weight=0, max_weight=200, min_age=0, max_age=100):

        # Check for duplicate IDs across all in-memory rides first
        if any(ride.id == id for ride in self.rides):
            raise ValueError(f"Ride with ID {id} already exists.")
        if not self.db_connection:
            print(f"{COLOR_RED}Cannot add ride to DB: No database connection. Adding only to in-memory.{COLOR_RESET}")
            new_ride = Ride(id, name, thrill, duration, queue_time, fatigue, mandatory, restricted, 
                            vip_access, affected_by_weather, type, min_weight, max_weight, min_age, max_age)
            self.rides.append(new_ride)
            self.ride_count = len(self.rides)
            return

        cursor = self.db_connection.cursor()
        
        # target table based on ride type
        table_name = ""
        if type == "land":
            table_name = "land_rides"
        elif type == "water":
            table_name = "water_rides"
        elif type == "kids":
            table_name = "kids_rides"
        else:
            raise ValueError("Invalid ride type specified.")

        insert_query = f"""
        INSERT INTO {table_name} (id, name, thrill, duration, queue_time, fatigue, mandatory, restricted,
          vip_access, affected_by_weather, min_weight, max_weight, min_age, max_age)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
         """
        try:
            cursor.execute(insert_query, (id, name, thrill, duration, queue_time, fatigue, mandatory, restricted, 
                                          vip_access, affected_by_weather, min_weight, max_weight, min_age, max_age))
            self.db_connection.commit()
    
            # Add to in-memory list after successful DB insert
            new_ride = Ride(id, name, thrill, duration, queue_time, fatigue, mandatory, restricted, vip_access, 
                            affected_by_weather, type, min_weight, max_weight, min_age, max_age)
            self.rides.append(new_ride)
            self.ride_count = len(self.rides)
            print(f"{COLOR_GREEN}Ride '{name}' ({type}) added to database successfully!{COLOR_RESET}")
        except Error as e:
            print(f"{COLOR_RED}Error adding ride to database: {e}{COLOR_RESET}")
            raise
        finally:
            cursor.close()

    def load_rides_from_db(self):
        # Loads rides from all tables in the database into the in-memory list.
        self.rides = []
        if not self.db_connection:
            print(f"{COLOR_RED}Cannot load rides: No database connection.{COLOR_RESET}")
            return

        cursor = self.db_connection.cursor()
        ride_tables = ["land_rides", "water_rides", "kids_rides"]
        
        for table_name in ride_tables:
            # Ensuring the SELECT query matches the order of arguments for Ride constructor
            select_query = f"""
            SELECT id, name, thrill, duration, queue_time, fatigue, mandatory, restricted,
              vip_access, affected_by_weather, min_weight, max_weight, min_age, max_age 
            FROM {table_name}
            """
            try:
                cursor.execute(select_query)
                records = cursor.fetchall()
                for row in records:
                    ride_type = table_name.replace('_rides', '') # Infer type from table name
                    # Correctly unpack row and pass 'type' explicitly
                    
                    self.rides.append(Ride(
                        row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9], # First 10 positional args
                        ride_type, 
                        row[10], row[11], row[12], row[13] 
                    ))
            except Error as e:
                # Handle case where a table might not exist yet
                print(f"{COLOR_YELLOW}Warning: Could not load rides from {table_name}: {e}{COLOR_RESET}")
        cursor.close() 
        self.ride_count = len(self.rides)
        print(f"{COLOR_GREEN}Loaded {self.ride_count} rides from the database.{COLOR_RESET}")

    def update_ride_restrictions(self):
        # Updates existing ride restrictions
        if not self.db_connection:
            print(f"{COLOR_RED}Cannot update ride restrictions: No database connection.{COLOR_RESET}")
            return
        cursor = self.db_connection.cursor()
        
        # Define which rides should remain restricted (taken as 5 )
        restricted_rides = {
            'L007',  # Pirate Ship
            'L012',  # Hyperverse
            'W002',  # Drop Loop
            'W010',  # Harakiri
            'K011'   # Mini Top Spin
        }
        
        # Update all rides to be non-restricted first
        tables = ['land_rides', 'water_rides', 'kids_rides']
        
        try:
            for table in tables:
                update_query = f"UPDATE {table} SET restricted = FALSE"
                cursor.execute(update_query)
                print(f"{COLOR_GREEN}Updated all rides in {table} to non-restricted.{COLOR_RESET}")
            
            for ride_id in restricted_rides:
                # Determine which table based on ride ID prefix
                if ride_id.startswith('L'):
                    table = 'land_rides'
                elif ride_id.startswith('W'):
                    table = 'water_rides'
                elif ride_id.startswith('K'):
                    table = 'kids_rides'
                else:
                    continue
                
                update_query = f"UPDATE {table} SET restricted = TRUE WHERE id = %s"
                cursor.execute(update_query, (ride_id,))
                print(f"{COLOR_YELLOW}Set ride {ride_id} to restricted.{COLOR_RESET}")
            
            self.db_connection.commit()
            print(f"{COLOR_GREEN}Successfully updated ride restrictions! Only 5 rides are now restricted.{COLOR_RESET}")
            
            # Reload rides from database to reflect changes
            self.load_rides_from_db()
            
        except Error as e:
            print(f"{COLOR_RED}Error updating ride restrictions: {e}{COLOR_RESET}")
        finally:
            cursor.close()

    def add_default_rides(self):
        # Adds a set of predefined rides to the database if no rides are currently loaded."""
        if not self.rides:
            print(f"{COLOR_YELLOW}Adding default rides (database appears empty or failed to load)...{COLOR_RESET}")
            
            # Land Rides 
            land_rides_data = [
                ("L001", "Mission Interstellar", 9, 3, 25, 8, False, False, True, True, "land", 40, 120, 12, 65),
                ("L002", "Sky Wheel", 3, 5, 10, 2, False, False, True, True, "land", 0, 150, 3, 80),
                ("L003", "Adventures of Chikku", 4, 4, 8, 3, False, False, False, False, "land", 0, 80, 5, 16),
                ("L004", "Twist and Shout", 7, 3, 20, 6, False, False, True, True, "land", 35, 110, 10, 60),
                ("L005", "Rockin' Tug", 5, 4, 12, 4, False, False, True, True, "land", 25, 100, 8, 70),
                ("L006", "Termite Coaster and Train", 6, 5, 15, 5, False, False, False, False, "land", 30, 120, 10, 75),
                ("L007", "Pirate Ship", 8, 4, 18, 7, False, True, True, True, "land", 40, 130, 12, 65), # RESTRICTED
                ("L008", "Wonder Splash", 5, 3, 10, 4, False, False, True, True, "land", 20, 100, 6, 70),
                ("L009", "Grand Prix", 6, 6, 15, 5, False, False, True, False, "land", 25, 120, 8, 75),
                ("L010", "Crazy Cars", 4, 3, 8, 3, False, False, False, False, "land", 15, 90, 5, 80),
                ("L011", "Sky Tilt (New)", 8, 3, 22, 7, False, False, True, True, "land", 45, 120, 14, 60),
                ("L012", "Hyperverse", 10, 2, 30, 9, False, True, True, True, "land", 50, 110, 16, 55), # RESTRICTED
                ("L013", "Recoil", 9, 3, 28, 8, False, False, True, True, "land", 45, 120, 14, 60),
                ("L014", "Maverick", 9, 3, 25, 8, False, False, True, True, "land", 45, 115, 14, 65),
                ("L015", "Equinox", 8, 4, 20, 7, False, False, True, True, "land", 40, 120, 12, 65),
                ("L016", "Techno Jump", 7, 2, 15, 6, False, False, True, True, "land", 35, 110, 10, 70),
                ("L017", "Twin Flip T Rex", 8, 3, 22, 7, False, False, True, True, "land", 40, 120, 12, 65),
                ("L018", "Wonderla Bamba", 6, 4, 12, 5, False, False, True, True, "land", 30, 120, 8, 75),
                ("L019", "G Fall", 10, 1, 35, 9, False,True, True, True, "land", 50, 110, 18, 50)
            ]
            
            # Water Rides 
            water_rides_data = [
                ("W001", "Rainbow Loooops", 8, 4, 25, 7, False, False, True, True, "water", 40, 120, 12, 65),
                ("W002", "Drop Loop", 9, 3, 30, 8, False, True, True, True, "water", 45, 110, 14, 60), # RESTRICTED
                ("W003", "Rain Disco", 6, 5, 15, 5, False, False, True, True, "water", 25, 120, 8, 75),
                ("W004", "Boomerang", 7, 4, 20, 6, False, False, True, True, "water", 35, 115, 10, 70),
                ("W005", "Pirate Lagoon", 5, 6, 12, 4, False, False, True, True, "water", 20, 130, 6, 80),
                ("W006", "Fun Racers", 4, 3, 8, 3, False, False, False, True, "water", 15, 100, 5, 75),
                ("W007", "Uphill Racer", 6, 4, 15, 5, False, False, True, True, "water", 30, 120, 8, 70),
                ("W008", "Bullet", 8, 2, 25, 7, False, False, True, True, "water", 40, 115, 12, 65),
                ("W009", "Wavy and Vertical Fall", 9, 3, 28, 8, False, False, True, True, "water", 45, 120, 14, 60),
                ("W010", "Harakiri", 10, 2, 35, 9, False, True, True, True, "water", 50, 110, 16, 55), # RESTRICTED
                ("W011", "Mammoth", 7, 5, 18, 6, False, False, True, True, "water", 35, 130, 10, 70),
                ("W012", "Splash", 3, 4, 5, 2, False, False, False, True, "water", 0, 150, 3, 85),
                ("W013", "Wave Pools", 2, 8, 5, 2, False, False, False, True, "water", 0, 200, 0, 90),
                ("W014", "Lazy River", 1, 10, 3, 1, False, False, False, True, "water", 0, 200, 0, 95),
                ("W015", "Sea Lagoon", 3, 6, 5, 2, False, False, False, True, "water", 0, 180, 3, 85),
                ("W016", "Drop and Tornado", 8, 4, 22, 7, False, False, True, True, "water", 40, 120, 12, 65),
                ("W017", "Screw", 7, 3, 18, 6, False, False, True, True, "water", 35, 115, 10, 70)
            ]

            # Kids Rides 
            kids_rides_data = [
                ("K001", "Mini Coaster", 3, 5, 10, 2, False, False, False, False, "kids", 15, 80, 4, 14),
                ("K002", "Bumper Cars", 2, 8, 5, 1, False, False, False, False, "kids", 20, 90, 6, 16),
                ("K003", "Kiddie Swings", 2, 3, 5, 1, False, False, False, False, "kids", 10, 70, 3, 12),
                ("K004", "Mini Pirate Ship", 3, 3, 8, 2, False, False, False, False, "kids", 15, 80, 5, 14),
                ("K005", "Kiddies Wheel", 2, 4, 6, 1, False, False, False, False, "kids", 10, 85, 3, 15),
                ("K006", "Coco Cup", 2, 3, 5, 1, False, False, False, False, "kids", 12, 75, 4, 13),
                ("K007", "Carousel", 1, 4, 3, 1, False, False, False, False, "kids", 5, 90, 2, 16),
                ("K008", "Flying Jumbo", 2, 3, 6, 1, False, False, False, False, "kids", 10, 80, 3, 14),
                ("K009", "Convoy", 2, 4, 5, 1, False, False, False, False, "kids", 8, 85, 3, 15),
                ("K010", "Moon Base", 3, 3, 8, 2, False, False, False, False, "kids", 15, 80, 4, 14),
                ("K011", "Mini Top Spin", 3, 3, 10, 2, False, True, False, False, "kids", 18, 85, 5, 16), # RESTRICTED
                ("K012", "Circus Train", 1, 5, 3, 1, False, False, False, False, "kids", 5, 100, 2, 18),
                ("K013", "Funky Monkey", 2, 4, 6, 1, False, False, False, False, "kids", 12, 80, 4, 15)
            ]

            all_default_rides = land_rides_data + water_rides_data + kids_rides_data
            
            for ride_data in all_default_rides:
                try:
                    self.add_ride(*ride_data)
                except (ValueError, Error) as e:
                    print(f"{COLOR_RED}Warning: Could not add default ride {ride_data[1]}: {e}{COLOR_RESET}")
        else:
            print(f"{COLOR_YELLOW}Default rides not added as rides already exist in the database.{COLOR_RESET}")
            # Since rides exist, update their restrictions
            self.update_ride_restrictions()

    def add_default_admin_user(self):
        # Adds a default admin user if the users table is empty
        if not self.db_connection:
            print(f"{COLOR_RED}Cannot add default user: No database connection.{COLOR_RESET}")
            return

        cursor = self.db_connection.cursor()
        try:
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            if user_count == 0:
                print(f"{COLOR_YELLOW}Adding default admin user...{COLOR_RESET}")
                staff_id = "admin"
                password_hash = bcrypt.generate_password_hash("password123").decode('utf-8')
                role = "admin"
                insert_user_query = "INSERT INTO users (staff_id, password_hash, role) VALUES (%s, %s, %s)"
                cursor.execute(insert_user_query, (staff_id, password_hash, role))
                self.db_connection.commit()
                print(f"{COLOR_GREEN}Default admin user '{staff_id}' added successfully. Password: password123{COLOR_RESET}")
            else:
                print(f"{COLOR_YELLOW}Default admin user not added as users already exist.{COLOR_RESET}")
        except Error as e:
            print(f"{COLOR_RED}Error adding default admin user: {e}{COLOR_RESET}")
        finally:
            cursor.close()

    def get_user_by_staff_id(self, staff_id):
        # Retrieves user data by staff_id from the database."""
        if not self.db_connection:
            return None
        cursor = self.db_connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT staff_id, password_hash, role FROM users WHERE staff_id = %s", (staff_id,))
            user = cursor.fetchone()
            return user
        except Error as e:
            print(f"{COLOR_RED}Error fetching user: {e}{COLOR_RESET}")
            return None
        finally:
            cursor.close()

    def close_db_connection(self):
        # Closes the database connection 
        if self.db_connection and self.db_connection.is_connected():
            self.db_connection.close()
            print(f"{COLOR_GREEN}MySQL connection closed.{COLOR_RESET}")

class PlanModel:
    # Represents the generated optimal ride plan
    def __init__(self, selected_rides, total_thrill, remaining_time): 
        self.selected_rides = selected_rides
        self.selected_count = len(selected_rides)
        self.total_thrill = total_thrill
        self.remaining_time = remaining_time

# Heap Implementation
def generate_optimal_plan(model):
    
    """Generates an optimal ride plan based on available time,VIP status, weather conditions, user age, and weight.
     Uses a max-heap to prioritize rides by thrill. and includes a gap time between rides.
     Supports ride preference (like dry_only, wet_only, or mixed), with age-based thrill filtering for adults over 40"""
    
    heap = []  # Min-heap that stores negative thrill for max-heap behavior.
    plan = PlanModel([], 0, model.total_time) 

    # Determine the gap time based on total available time
    ride_gap_time = 5 if model.total_time < 30 else 10
    print(f"Calculated ride gap time: {ride_gap_time} minutes.") 

    # Separate rides by type if ride_preference is specified
    eligible_rides = []
    
    # Filter eligible rides first
    for i, ride in enumerate(model.rides):
        # Skip restricted rides or weather-affected rides.
        if ride.restricted or (model.bad_weather and ride.affected_by_weather):
            continue
            
        # filtering based on age and weight 
        if not (ride.min_age <= model.user_age <= ride.max_age):
            continue
        if not (ride.min_weight <= model.user_weight <= ride.max_weight):
            continue
        if model.user_age > 40 and ride.thrill > 6:
            print(f"Skipping ride '{ride.name}' (thrill: {ride.thrill}) - too intense for user over 40")
            continue
            
        eligible_rides.append((i, ride))
    
    print(f"Total eligible rides after filtering: {len(eligible_rides)}")
    
    # ride preference filtering and ordering
    if hasattr(model, 'ride_preference') and model.ride_preference:
        if model.ride_preference == 'dry_only':
            # Only dry rides
            eligible_rides = [(i, ride) for i, ride in eligible_rides if ride.type in ['land', 'kids']]
        elif model.ride_preference == 'wet_only':
            # Only water rides
            eligible_rides = [(i, ride) for i, ride in eligible_rides if ride.type == 'water']
        elif model.ride_preference == 'dry_first':
            # If dry rides first, separate and sort by thrill
            dry_rides = [(i, ride) for i, ride in eligible_rides if ride.type in ['land', 'kids']]
            wet_rides = [(i, ride) for i, ride in eligible_rides if ride.type == 'water']
            
            dry_rides.sort(key=lambda x: x[1].thrill, reverse=True)
            wet_rides.sort(key=lambda x: x[1].thrill, reverse=True)
            eligible_rides = dry_rides + wet_rides
    
    # If no ride preference or mixed preference, use heap-based selection
    if not hasattr(model, 'ride_preference') or not model.ride_preference or model.ride_preference not in ['dry_only', 'wet_only', 'dry_first']:
        # heap-based approach
        for i, ride in eligible_rides:
            heapq.heappush(heap, (-ride.thrill, i)) #taking -ve so that it behaves like a max-heap
        
        # Iterate while there are rides in the heap, with time constraint
        while heap and plan.remaining_time > 0: 
            neg_thrill, ride_index = heapq.heappop(heap)
            ride = model.rides[ride_index]

            # adjusted queue time based on VIP access
            adjusted_queue_time = ride.queue_time // 2 if model.is_vip and ride.vip_access else ride.queue_time
            current_ride_total_time = ride.duration + adjusted_queue_time
            
            if len(plan.selected_rides) > 0: # Add gap only if it's not the first ride
                current_ride_total_time += ride_gap_time
            # Check if the ride can be added within time constraint
            if current_ride_total_time <= plan.remaining_time:
                plan.selected_rides.append(ride_index)
                plan.total_thrill += ride.thrill
                plan.remaining_time -= current_ride_total_time
    else:
        # Sequential selection for dry_first, dry_only, or wet_only
        for i, ride in eligible_rides:
            if plan.remaining_time <= 0: 
                break
            adjusted_queue_time = ride.queue_time // 2 if model.is_vip and ride.vip_access else ride.queue_time
            current_ride_total_time = ride.duration + adjusted_queue_time
            if len(plan.selected_rides) > 0: 
                current_ride_total_time += ride_gap_time
            if current_ride_total_time <= plan.remaining_time:
                plan.selected_rides.append(i)
                plan.total_thrill += ride.thrill
                plan.remaining_time -= current_ride_total_time
    print(f"Final plan: {len(plan.selected_rides)} rides selected, total thrill: {plan.total_thrill}, remaining time: {plan.remaining_time}")
    return plan

#  Global ParkModel Instance 
initial_total_time = 180
initial_is_vip = True
initial_bad_weather = False
initial_user_age = 25
initial_user_weight = 70
park_model = ParkModel(initial_total_time, initial_is_vip, initial_bad_weather, initial_user_age, initial_user_weight)

# Authentication 
def token_required(f):
    # to check for a valid JWT in the Authorization header 

    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1] # Expects "Bearer <token>"
            except IndexError:
                return jsonify({'message': 'Token is missing or malformed!'}), 401

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['staff_id']
            current_role = data['role']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        except Exception as e:
            print(f"Token decoding error: {e}")
            return jsonify({'message': 'An error occurred during token validation.'}), 500
        return f(current_user, current_role, *args, **kwargs)
    return decorated

def roles_required(roles):
    # to check if the authenticated user has one of the required roles.
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, current_role, *args, **kwargs):
            if current_role not in roles:
                return jsonify({'message': 'Access forbidden: Insufficient permissions.'}), 403
            return f(current_user, current_role, *args, **kwargs)
        return decorated_function
    return decorator

# Flask API Routes
@app.route('/api/login', methods=['POST'])
def login():
    # API endpoint for user login 
    data = request.get_json()
    staff_id = data.get('staff_id')
    password = data.get('password')

    if not staff_id or not password:
        return jsonify({'message': 'Staff ID and password are required.'}), 400
    user = park_model.get_user_by_staff_id(staff_id)
    if not user or not bcrypt.check_password_hash(user['password_hash'], password):
        return jsonify({'message': 'Invalid Staff ID or password.'}), 401

    # Generate JWT
    token_payload = {
        'staff_id': user['staff_id'],
        'role': user['role'],
        'exp': datetime.utcnow() + app.config['JWT_ACCESS_TOKEN_EXPIRES']
    }
    token = jwt.encode(token_payload, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({
        'message': 'Login successful!',
        'token': token,
        'staff_id': user['staff_id'],
        'role': user['role']
    }), 200

@app.route('/api/rides', methods=['GET'])
def get_rides():
    # API endpoint to retrieve all available rides
    try:
        rides_data = []
        for ride in park_model.rides:
            rides_data.append({
                'id': ride.id,
                'name': ride.name,
                'thrill': ride.thrill,
                'duration': ride.duration,
                'queue_time': ride.queue_time,
                'fatigue': ride.fatigue,
                'mandatory': ride.mandatory,
                'restricted': ride.restricted,
                'vip_access': ride.vip_access,
                'affected_by_weather': ride.affected_by_weather,
                'type': ride.type,
                'min_weight': getattr(ride, 'min_weight', 0),
                'max_weight': getattr(ride, 'max_weight', 200),
                'min_age': getattr(ride, 'min_age', 0),
                'max_age': getattr(ride, 'max_age', 100)
            })
        return jsonify(rides_data), 200
    except Exception as e:
        print(f"Error in get_rides endpoint: {e}")
        return jsonify({'error': f"Failed to retrieve rides: {str(e)}"}), 500

@app.route('/api/add_ride', methods=['POST'])
@token_required
@roles_required(['admin'])
def add_ride(current_user, current_role):
    # admin authentication 
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data provided'}), 400

        # Validate required fields
        required_fields = ['id', 'name', 'thrill', 'duration', 'queue_time', 'fatigue', 'type']
        for field in required_fields:
                if field not in data or data[field] is None or data[field] == '':
                    return jsonify({'error': f'Missing required field: {field}'}), 400

        # Validate and convert data types
        ride_id = str(data.get('id')).strip()
        name = str(data.get('name')).strip()
        thrill = int(data.get('thrill'))
        duration = int(data.get('duration'))
        queue_time = int(data.get('queue_time'))
        fatigue = int(data.get('fatigue'))
        mandatory = bool(data.get('mandatory', False))
        restricted = bool(data.get('restricted', False))
        vip_access = bool(data.get('vip_access', False))
        affected_by_weather = bool(data.get('affected_by_weather', False))
        ride_type = str(data.get('type')).lower()
        min_weight = int(data.get('min_weight', 0))
        max_weight = int(data.get('max_weight', 200))
        min_age = int(data.get('min_age', 0))
        max_age = int(data.get('max_age', 100))
        if not name:
            return jsonify({'error': 'Ride name cannot be empty'}), 400
        if not (1 <= thrill <= 10):
            return jsonify({'error': 'Thrill must be between 1 and 10'}), 400
        if not (1 <= fatigue <= 10):
            return jsonify({'error': 'Fatigue must be between 1 and 10'}), 400
        if duration < 1:
            return jsonify({'error': 'Duration must be at least 1 minute'}), 400
        if queue_time < 0:
            return jsonify({'error': 'Queue time cannot be negative'}), 400
        if ride_type not in ['land', 'water', 'kids']:
            return jsonify({'error': 'Invalid ride type. Must be "land", "water", or "kids".'}), 400

        park_model.add_ride(
            ride_id, name, thrill, duration, queue_time, fatigue,
        mandatory, restricted, vip_access, affected_by_weather, ride_type,
        min_weight, max_weight, min_age, max_age
        )
        return jsonify({'message': f"Ride '{name}' added successfully by {current_user}!"}), 201
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        print(f"Error in add_ride endpoint: {e}")
        return jsonify({'error': f"Failed to add ride: {str(e)}"}), 500

@app.route('/api/generate_plan', methods=['POST'])
def generate_plan():
    """API endpoint to generate an optimal ride plan based on user preferences."""
    try:
        data = request.get_json()
        print(f"Received data for generate_plan: {data}")
        
        if not data:
            return jsonify({'error': 'Invalid JSON data provided'}), 400
        if 'total_time' not in data or 'user_age' not in data or 'user_weight' not in data: # Removed max_daily_rides
            return jsonify({'error': 'total_time, user_age, and user_weight are required'}), 400
        total_time = int(data.get('total_time'))
        is_vip = bool(data.get('is_vip', False))
        bad_weather = bool(data.get('bad_weather', False))
        user_age = int(data.get('user_age'))
        user_weight = int(data.get('user_weight'))
        ride_preference = data.get('ride_preference', '') 

        # Validate inputs
        if total_time < 1:
            return jsonify({'error': 'Total time must be at least 1 minute'}), 400
        if user_age < 1 or user_age > 100:
            return jsonify({'error': 'User age must be between 1 and 100'}), 400
        if user_weight < 10 or user_weight > 300:
            return jsonify({'error': 'User weight must be between 10 and 300 kg'}), 400

        # Update park model parameters
        park_model.total_time = total_time
        park_model.is_vip = is_vip
        park_model.bad_weather = bad_weather
        park_model.user_age = user_age
        park_model.user_weight = user_weight
        park_model.ride_preference = ride_preference 

        print(f"Updated ParkModel: total_time={park_model.total_time}, is_vip={park_model.is_vip}, bad_weather={park_model.bad_weather}, user_age={park_model.user_age}, user_weight={park_model.user_weight}, ride_preference={park_model.ride_preference}")

        # Check if there are any rides available
        if not park_model.rides:
            return jsonify({'error': 'No rides available. Please add some rides first.'}), 400

        # Generate the optimal plan
        plan = generate_optimal_plan(park_model)

        # Prepare selected rides details for response
        selected_rides_details = []
        for ride_index in plan.selected_rides:
            ride = park_model.rides[ride_index]
            adjusted_queue_time = ride.queue_time // 2 if park_model.is_vip and ride.vip_access else ride.queue_time
            selected_rides_details.append({
                'id': ride.id,
                'name': ride.name,
                'thrill': ride.thrill,
                'duration': ride.duration,
                'queue_time': ride.queue_time,
                'vip_queue_time': adjusted_queue_time,
                'type': ride.type 
            })

        # Prepare the plan data for JSON response
        plan_data = {
            'selected_rides': selected_rides_details,
            'total_thrill': plan.total_thrill,
            'remaining_time': plan.remaining_time,
            # 'remaining_rides': plan.remaining_fatigue,  
            'total_time_used': total_time,
            # 'max_daily_rides_used': max_daily_rides,
            'is_vip_used': is_vip,
            'bad_weather_used': bad_weather,
            'user_age_used': user_age,
            'user_weight_used': user_weight,
            'ride_preference_used': ride_preference  
        }
        return jsonify(plan_data), 200
    except ValueError as ve:
        return jsonify({'error': f'Invalid input: {str(ve)}'}), 400
    except Exception as e:
        print(f"Error in generate_plan endpoint: {e}")
        return jsonify({'error': f"Failed to generate plan: {str(e)}"}), 500

# Health check endpoint to verify the API is running
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Theme Park API is running',
        'rides_count': len(park_model.rides),
        'db_connected': park_model.db_connection is not None and park_model.db_connection.is_connected()
    }), 200

# Application startup
def initialize_app():
    # Initializing with default data
    try:
        park_model.add_default_rides()
        park_model.add_default_admin_user()
        print(f"{COLOR_GREEN}Application initialized successfully with {len(park_model.rides)} rides.{COLOR_RESET}")
    except Exception as e:
        print(f"{COLOR_RED}Error during application initialization: {e}{COLOR_RESET}")

# Main execution block
if __name__ == '__main__':
    initialize_app()
    try:
        print(f"{COLOR_CYAN}Starting Flask server on http://127.0.0.1:5000{COLOR_RESET}")
        app.run(debug=True, port=5000, host='127.0.0.1')
    except KeyboardInterrupt:
        print(f"\n{COLOR_YELLOW}Server shutdown requested by user.{COLOR_RESET}")
    except Exception as e:
        print(f"{COLOR_RED}Error starting server: {e}{COLOR_RESET}")
    finally:
        if park_model and park_model.db_connection:
            park_model.close_db_connection()