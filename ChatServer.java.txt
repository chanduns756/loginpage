import com.sun.net.httpserver.*;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

public class ChatServer {

    static final int PORT = 8080;
    static final File USERS_FILE = new File("users.json");
    static final File MESSAGES_FILE = new File("messages.json");
    static Map<String, String> tokenStore = new HashMap<>();

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        server.createContext("/api/auth/register", ChatServer::register);
        server.createContext("/api/auth/login", ChatServer::login);
        server.createContext("/api/messages", ChatServer::messages);

        server.setExecutor(null);
        server.start();

        System.out.println("✅ Java Chat Backend running at http://localhost:" + PORT);
    }

    /* ================= REGISTER ================= */
    static void register(HttpExchange ex) throws IOException {
        if (!ex.getRequestMethod().equalsIgnoreCase("POST")) {
            ex.sendResponseHeaders(405, -1);
            return;
        }

        String body = readBody(ex);
        if (USERS_FILE.length() > 0 && Files.readString(USERS_FILE.toPath()).contains(body.split("\"email\":\"")[1].split("\"")[0])) {
            sendJson(ex, 400, "{\"error\":\"User already exists\"}");
            return;
        }

        Files.writeString(USERS_FILE.toPath(), body + "\n", StandardOpenOption.APPEND);
        sendJson(ex, 200, "{\"message\":\"Registered successfully\"}");
    }

    /* ================= LOGIN ================= */
    static void login(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        String email = body.split("\"email\":\"")[1].split("\"")[0];
        String password = body.split("\"password\":\"")[1].split("\"")[0];

        List<String> users = Files.readAllLines(USERS_FILE.toPath());

        for (String u : users) {
            if (u.contains(email) && u.contains(password)) {
                String token = UUID.randomUUID().toString();
                tokenStore.put(token, email);

                sendJson(ex, 200,
                        "{\"token\":\"" + token + "\",\"name\":\"" + email.split("@")[0] + "\"}");
                return;
            }
        }

        sendJson(ex, 403, "{\"error\":\"Invalid credentials\"}");
    }

    /* ================= MESSAGES ================= */
    static void messages(HttpExchange ex) throws IOException {
        String auth = ex.getRequestHeaders().getFirst("Authorization");

        if (auth == null || !auth.startsWith("Bearer ") || !tokenStore.containsKey(auth.substring(7))) {
            ex.sendResponseHeaders(403, -1);
            return;
        }

        if (ex.getRequestMethod().equalsIgnoreCase("GET")) {
            String data = Files.readString(MESSAGES_FILE.toPath());
            sendJson(ex, 200, data.isBlank() ? "[]" : "[" + data + "]");
            return;
        }

        if (ex.getRequestMethod().equalsIgnoreCase("POST")) {
            String body = readBody(ex);
            String msg = body.substring(0, body.length() - 1)
                    + ",\"timestamp\":" + System.currentTimeMillis() + "}";

            Files.writeString(MESSAGES_FILE.toPath(), msg + ",\n", StandardOpenOption.APPEND);
            sendJson(ex, 200, "{\"status\":\"ok\"}");
        }
    }

    /* ================= HELPERS ================= */
    static String readBody(HttpExchange ex) throws IOException {
        return new BufferedReader(new InputStreamReader(ex.getRequestBody()))
                .lines().collect(Collectors.joining());
    }

    static void sendJson(HttpExchange ex, int code, String json) throws IOException {
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        ex.sendResponseHeaders(code, json.getBytes().length);
        ex.getResponseBody().write(json.getBytes());
        ex.close();
    }
}
