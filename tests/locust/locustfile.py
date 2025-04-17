from locust import HttpUser, task, between
import random
import json

class APIUser(HttpUser):
    # Users will wait between 1-3 seconds between tasks
    wait_time = between(1, 3)
    
    # Sample data for testing
    user_data = [
        {"username": "Edward", "password": "Edward_1988"},
        {"username": "Michael", "password": "Edward_1988"},
        {"username": "John", "password": "Edward_1988"},
        # Add more test data as needed
    ]
    
    @task(1)  # This task will be performed 3x more frequently
    def update_location(self):
        # Select random user data
        data = random.choice(self.user_data)
        
        
        # Send POST request
        response = self.client.post(
            "/api/login",  # Adjust path as needed
            json=data,
            name="Login"
        )
        
        # Optional: Add validation
        if response.status_code != 200:
            print(f"Failed to login: {response.status_code}, {response.text}")
    
    @task(1)  # This task will be performed less frequently
    def get_schedule(self):
        # Randomly select employeeId and scheduleId
        employee_id = f"cm6dl3vv30003t5y9rhps43rb"
        schedule_id = f"cm7s2dxvu0004l0lsihe4mqgp"
        
        # Send GET request with query parameters
        response = self.client.get(
            f"/api/schedules/find?employeeId={employee_id}&scheduleId={schedule_id}",
            name="Get Schedule"
        )
        
        # Optional: Add validation
        if response.status_code != 200:
            print(f"Failed to get schedule: {response.status_code}, {response.text}")
