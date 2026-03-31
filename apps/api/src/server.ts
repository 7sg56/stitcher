import app from "./app";

const PORT = parseInt(process.env.PORT || "3001", 10);

const start = async () => {
    try {
        await app.listen({ port: PORT, host: "0.0.0.0" });
        app.log.info(`Server running on port ${PORT}`);
    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};

start();
