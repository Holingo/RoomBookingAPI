const db = require("./db");

async function run() {
    const url = "http://localhost:3000/api/reservations";
    const payload = {
        roomId: 1,
        reservedBy: "Haker",
        participants: 2,
        startTime: "2028-12-10T10:00:00.000Z", // Używamy odległej daty
        endTime: "2028-12-10T12:00:00.000Z"
    };

    console.log("Wysyłanie 10 requestów równolegle...");
    // Wysyłamy 10 requestów w tym samym ułamku sekundy
    const requests = Array.from({ length: 10 }).map(() =>
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map(r => r.status);
    console.log("Statusy odpowiedzi:", statuses);

    // Sprawdzamy, ile rezerwacji rzeczywiście powstało w bazie
    const count = await db("reservations")
        .where({ room_id: 1, status: "CONFIRMED" })
        .where("start_time", "2028-12-10T10:00:00.000Z")
        .count("* as total")
        .first();

    console.log(`Liczba potwierdzonych rezerwacji w bazie dla tego przedziału: ${count.total}`);
    process.exit(0);
}
run();