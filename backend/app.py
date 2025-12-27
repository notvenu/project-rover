import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import time

# 1. --- App and CORS Setup (Unchanged) ---
app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. --- MOCK DATA (Unchanged) ---
LOCATIONS = [
    (40.7128, -74.0060), # 0: Depot (NYC)
    (40.7306, -73.9352), # 1: Stop A (East Village)
    (40.7589, -73.9851), # 2: Stop B (Times Square)
    (40.6892, -74.0445), # 3: Stop C (Statue of Liberty)
    (40.6782, -73.9442)  # 4: Stop D (Brooklyn)
]

TIME_MATRIX_NORMAL = [
    [0, 10, 15, 25, 20],
    [10, 0, 8, 18, 12],
    [15, 8, 0, 10, 6],
    [25, 18, 10, 0, 14],
    [20, 12, 6, 14, 0]
]

TIME_MATRIX_TRAFFIC = [
    [0, 10, 15, 25, 20],
    [10, 0, 8, 18, 12],
    [15, 8, 0, 10, 99], # Jam: B -> D
    [25, 18, 10, 0, 14],
    [20, 12, 99, 14, 0]  # Jam: D -> B
]

DISTANCE_MATRIX = [
    [0, 15, 22, 38, 30],
    [15, 0, 12, 27, 18],
    [22, 12, 0, 15, 9],
    [38, 27, 15, 0, 21],
    [30, 18, 9, 21, 0]
]

NUM_VEHICLES = 2


# 3. --- AI SOLVER (Google OR-Tools) (Unchanged) ---
def solve_vrp(cost_matrix):
    manager = pywrapcp.RoutingIndexManager(len(cost_matrix), NUM_VEHICLES, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return cost_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)

    solution = routing.SolveWithParameters(search_parameters)
    
    routes = []
    if solution:
        for vehicle_id in range(NUM_VEHICLES):
            index = routing.Start(vehicle_id)
            route = [manager.IndexToNode(index)]
            while not routing.IsEnd(index):
                index = solution.Value(routing.NextVar(index))
                route.append(manager.IndexToNode(index))
            routes.append(route)
    return routes


# 4. --- API ENDPOINTS (Corrected) ---
@app.get("/get_data")
async def get_data(mode: str = "normal"):
    """
    Solves the VRP and returns locations, routes, and stats.
    """
    
    time.sleep(0.5) 
    
    # --- THIS IS THE FIX ---
    # We must determine the correct matrix *first*
    if mode == 'traffic':
        time_matrix = TIME_MATRIX_TRAFFIC
    else:
        time_matrix = TIME_MATRIX_NORMAL
    # --- END FIX ---
    
    
    # 1. Solve the routes based on the *correct* time_matrix
    #    (The old code was incorrectly passing TIME_MATRIX_NORMAL here)
    index_routes = solve_vrp(time_matrix) # <--- BUG WAS HERE
    
    
    # 2. Get coordinates for the map (Unchanged)
    coord_routes = []
    for route in index_routes:
        coord_route = [LOCATIONS[index] for index in route]
        coord_routes.append(coord_route)
        
    # 3. Calculate stats for each route (Unchanged, this part was correct)
    route_stats = []
    for route in index_routes:
        total_time = 0
        total_distance = 0
        for i in range(len(route) - 1):
            from_node = route[i]
            to_node = route[i+1]
            
            # This correctly uses the selected time_matrix
            total_time += time_matrix[from_node][to_node]
            
            # This correctly uses the distance matrix
            total_distance += DISTANCE_MATRIX[from_node][to_node]
            
        route_stats.append({
            "time": total_time,
            "distance": total_distance
        })
        
    return {
        "locations": LOCATIONS, 
        "routes": coord_routes,
        "index_routes": index_routes,
        "route_stats": route_stats
    }


# 5. --- Run command (Unchanged) ---
if __name__== "__main__":
    print("--- To run this app, use the command: ---")
    print("--- uvicorn app:app --reload --port 8000 ---")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)