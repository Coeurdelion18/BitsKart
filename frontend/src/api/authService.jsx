// encapsulates api call in a class. It "calls the backend"

import axios from "axios";

class AuthService {
    constructor() {
        this.api = axios.create({baseURL: "http://localhost:5000/api/auth"})
    }
    async login(email, password) {
        const response = await this.api.post("/login", {email, password}); //sends data to the server and saves the response in response
        return response.data;
    }
}

export default new AuthService();