import "../config/env.js";
import app from "./app.js";
import initDB from "../config/database.js";

const PORT = process.env.PORT || 3000;

initDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("Error conectando a la DB:", err.message);
    process.exit(1);
  });
