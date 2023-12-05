import "dotenv/config";
import Requests from "./requests/index.js";
import "./setup/tracer.js";

Requests.executeCycle();