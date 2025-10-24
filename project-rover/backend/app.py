import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # Import CORS
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

# 1. --- App and CORS Setup ---
app = FastAPI()

# This is CRITICAL for React (running on port 3000)
# to talk to FastAPI (running on port 8000)
origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. --- MOCK DATA ---
LOCATIONS = [
    (40.7128, -74.0060), # 0: Depot (NYC)
    (40.7306, -73.9352), # 1: Stop A (East Village)
    (40.7589, -73.9851), # 2: Stop B (Times Square)
    (40.6892, -74.0445), # 3: Stop C (Statue of Liberty)
    (40.6782, -73.9442)  # 4: Stop D (Brooklyn)
]

COST_MATRIX_NORMAL = [
    [0, 10, 15, 25, 20],
    [10, 0, 8, 18, 12],
    [15, 8, 0, 10, 6],
    [25, 18, 10, 0, 14],
    [20, 12, 6, 14, 0]
]

COST_MATRIX_TRAFFIC = [
    [0, 10, 15, 25, 20],
    [10, 0, 8, 18, 12],
    [15, 8, 0, 10, 99], # Jam: B -> D
    [25, 18, 10, 0, 14],
    [20, 12, 99, 14, 0]  # Jam: D -> B
]

NUM_VEHICLES = 2


# 3. --- AI SOLVER (Google OR-Tools) ---
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


# 4. --- API ENDPOINTS ---
@app.get("/get_data")
async def get_data(mode: str = "normal"):
    """
    Solves the VRP and returns both locations and routes.
    """
    if mode == 'traffic':
        cost_matrix = COST_MATRIX_TRAFFIC
    else:
        cost_matrix = COST_MATRIX_NORMAL
    
    index_routes = solve_vrp(cost_matrix)
    
    coord_routes = []
    for route in index_routes:
        coord_route = [LOCATIONS[index] for index in route]
        coord_routes.append(coord_route)
        
    return {"locations": LOCATIONS, "routes": coord_routes}


# 5. --- Run command ---
if __name__== "_main_":
    print("--- To run this app, use the command: ---")
    print("--- uvicorn app:app --reload --port 8000 ---")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)