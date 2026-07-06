const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyB9XnlTLiD07bpaxqn3xPloMOzHeiuHdDk"); // Thay bằng key của bạn hoặc process.env.GEMINI_API_KEY
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Hoặc gemini-pro

const moment = require('moment'); // Để định dạng ngày giờ chuẩn VNPAY
const qs = require('qs');         // Để sắp xếp tham số URL
const crypto = require('crypto'); // Để tạo mã bảo mật (hash)

const app = express();
app.use(cors());
app.use(express.json());

// ==========================
// Cấu hình CSDL TiDB Cloud
// ==========================
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com', // Lấy từ HOST
    port: process.env.DB_PORT || 4000,                                             // Lấy từ PORT
    user: process.env.DB_USER || '3qhZS3hkjF2gDVy.root',                           // Lấy từ USERNAME
    password: process.env.DB_PASS || 'ZVPPWHnjwITbQw1P',                      // Mật khẩu khi nhấn Generate
    database: process.env.DB_NAME || 'khachsan',                                   // Lấy từ DATABASE
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false // TiDB Cloud yêu cầu SSL an toàn
    }
});

db.connect((err) => {
    if (err) {
        console.error('Lỗi kết nối TiDB Cloud:', err);
        return;
    }
    console.log('Đã kết nối thành công đến TiDB Cloud (khachsan)!');
});


// Chạy định kỳ mỗi 10 phút để dọn dẹp giỏ hàng quá hạn
setInterval(() => {
    const timeoutSql = `
        UPDATE rooms 
        SET status = 'available' 
        WHERE id IN (
            SELECT room_id FROM booking_order 
            WHERE order_status = 'pending' 
            AND created_at < NOW() - INTERVAL 30 MINUTE
        )
    `;
    db.query(timeoutSql, (err) => {
        if (err) console.error("Lỗi dọn dẹp giỏ hàng quá hạn:", err);
        else {
            db.query("DELETE FROM booking_order WHERE order_status = 'pending' AND created_at < NOW() - INTERVAL 30 MINUTE");
        }
    });
}, 600000); // 10 phút
// const express = require("express");
// const cors = require("cors");
// const mysql = require("mysql");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");

// const moment = require('moment'); // Để định dạng ngày giờ chuẩn VNPAY
// const qs = require('qs');         // Để sắp xếp tham số URL
// const crypto = require('crypto'); // Để tạo mã bảo mật (hash)

// const app = express();
// app.use(cors());
// app.use(express.json());

// // ==========================
// // Cấu hình CSDL TiDB Cloud
// // ==========================
// // const db = mysql.createConnection({
// //     host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com', // Lấy từ HOST
// //     port: process.env.DB_PORT || 4000,                                             // Lấy từ PORT
// //     user: process.env.DB_USER || '3qhZS3hkjF2gDVy.root',                           // Lấy từ USERNAME
// //     password: process.env.DB_PASS || 'ZVPPWHnjwITbQw1P',                      // Mật khẩu khi nhấn Generate
// //     database: process.env.DB_NAME || 'khachsan',                                   // Lấy từ DATABASE
// //     ssl: {
// //         minVersion: 'TLSv1.2',
// //         rejectUnauthorized: true // TiDB Cloud yêu cầu SSL an toàn
// //     }
// // });
// // db.connect((err) => {
// //     if (err) {
// //         console.error('Lỗi kết nối TiDB Cloud:', err);
// //         return;
// //     }
// //     console.log('Đã kết nối thành công đến TiDB Cloud (khachsan)!');
// // });



// const db = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "",
//     database: "khachsan",
// });
// db.connect((err) => {
//     if (err) {
//         console.error("❌ Lỗi kết nối MySQL:", err);
//         process.exit(1);
//     }
//     console.log("✅ Kết nối MySQL thành công với cấu trúc CSDL đầy đủ.");
// });

//hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh


// ==========================
// Cấu hình JWT & Middleware Xác thực
// ==========================
const JWT_SECRET = process.env.JWT_SECRET || "your_new_secret_for_rooms";
const SALT_ROUNDS = 10;

// Middleware xác thực Token Người dùng (user_cred)
function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ message: "Không có token" });

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return res.status(401).json({ message: "Token sai định dạng" });

    const token = parts[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Token không hợp lệ" });
        req.userId = decoded.id; // ID người dùng
        req.user = decoded;
        next();
    });
}

// Middleware MỚI: Xác thực Token Admin (admin_cred)
function verifyAdminToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ message: "Không có token Admin" });

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return res.status(401).json({ message: "Token Admin sai định dạng" });
    
    const token = parts[1];
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Token không hợp lệ hoặc hết hạn" });
        
        req.adminId = decoded.id; // Lấy ID của Admin

        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: "Bạn không có quyền truy cập Admin." });
        }
        
        db.query("SELECT id FROM admin_cred WHERE id = ?", [decoded.id], (err2, rows) => {
            if (err2 || rows.length === 0) {
                return res.status(403).json({ message: "Bạn không có quyền truy cập Admin." });
            }
            next();
        });
    });
}





app.post("/api/auth/register", async (req, res) => {
    try {
        // 1. SỬA: Nhận biến 'name' thay vì 'full_name'
        // Kiểm tra xem bên Frontend gửi 'phone' hay 'phone_number' (ở đây mình để 'phone' cho gọn giống DB)
        const { username, password, email, name, phone } = req.body;
        
        if (!username || !password) return res.status(400).json({ message: "Thiếu username hoặc password" });
        
        const emailToCheck = email || null; 
        
        const checkQuery = `
            SELECT u.id 
            FROM user_cred u 
            LEFT JOIN user_info i ON u.id = i.user_id 
            WHERE u.username = ? 
            ${emailToCheck ? 'OR i.email = ?' : ''}
        `;
        
        const params = [username];
        if (emailToCheck) {
            params.push(emailToCheck);
        }

        db.query(checkQuery, params, async (err, rows) => {
            if (err) return res.status(500).json({ message: "DB error", error: err });
            if (rows.length > 0) return res.status(409).json({ message: "Username hoặc email đã tồn tại" });

            const hash = await bcrypt.hash(password, SALT_ROUNDS);
            
            // Chèn vào user_cred
            db.query("INSERT INTO user_cred (username, password) VALUES (?, ?)", [username, hash], (err2, result) => {
                if (err2) return res.status(500).json({ message: "DB error on user_cred insert", error: err2 });
                const userId = result.insertId;
                
                // 2. SỬA: Chèn biến 'name' và 'phone' vào bảng user_info
                // Lưu ý: Cột trong DB là `name` và `phone`
                const sqlUserInfo = "INSERT INTO user_info (user_id, email, name, phone) VALUES (?, ?, ?, ?)";
                
                db.query(sqlUserInfo, [userId, emailToCheck, name, phone], (err3) => {
                    if (err3) console.warn("Không chèn được vào user_info:", err3);
                    
                    const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
                    res.json({ message: "Đăng ký thành công", token, userId, username });
                });
            });
        });
    } catch (e) { res.status(500).json({ message: "Lỗi server" }); }
});

app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Thiếu username hoặc password" });

    // 1. CẬP NHẬT SQL: Thêm `c.status` vào SELECT để lấy dữ liệu trạng thái
    // Lưu ý: Giả sử cột 'status' nằm trong bảng 'user_cred' (c). 
    // Nếu nó nằm ở bảng 'user_info' thì sửa thành 'i.status'.
    const query = "SELECT c.id, c.username, c.password, c.status, i.email FROM user_cred c LEFT JOIN user_info i ON c.id = i.user_id WHERE c.username = ?";

    db.query(query, [username], async (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        if (rows.length === 0) return res.status(401).json({ message: "Sai username hoặc password" });

        const user = rows[0];

        // So sánh mật khẩu
        bcrypt.compare(password, user.password).then(match => {
            if (!match) return res.status(401).json({ message: "Sai username hoặc password" });

            // 2. KIỂM TRA STATUS
            // Nếu status KHÁC 'active' (ví dụ: 'inactive', 'banned', null...) thì chặn lại
            if (user.status !== 'active') {
                return res.status(403).json({ 
                    message: "Tài khoản chưa được kích hoạt hoặc đã bị khóa.",
                    status: user.status // Trả về status để Frontend biết nếu cần
                });
            }

            // 3. NẾU ACTIVE -> TẠO TOKEN VÀ CHO ĐĂNG NHẬP
            const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
            
            res.json({ 
                message: "Đăng nhập thành công", 
                token, 
                userId: user.id, 
                username: user.username, 
                email: user.email,
                status: user.status // Trả về 'active'
            });
        });
    });
});


/* ==========================================================
   V. ADMIN AUTH ENDPOINTS (admin_cred)
========================================================== */

// 1. POST /api/admin/auth/register (Đăng ký Admin)
app.post("/api/admin/auth/register", async (req, res) => {
    try {
        const { username, password, full_name } = req.body;
        if (!username || !password) 
            return res.status(400).json({ message: "Thiếu username hoặc password" });

        db.query("SELECT id FROM admin_cred WHERE username = ?", [username], async (err, rows) => {
            if (err) return res.status(500).json({ message: "DB error", error: err });
            if (rows.length > 0) 
                return res.status(409).json({ message: "Username Admin đã tồn tại" });

            const hash = await bcrypt.hash(password, SALT_ROUNDS);
            
            // Chèn vào bảng admin_cred
            db.query("INSERT INTO admin_cred (username, password, full_name) VALUES (?, ?, ?)", 
                [username, hash, full_name || 'Admin'], 
                (err2, result) => {
                    if (err2) return res.status(500).json({ message: "DB error on admin_cred insert", error: err2 });
                    
                    const adminId = result.insertId;
                    const token = jwt.sign({ id: adminId, role: 'admin' }, JWT_SECRET, { expiresIn: "7d" });
                    
                    res.status(201).json({ 
                        message: "Đăng ký Admin thành công", 
                        token, 
                        adminId, 
                        username 
                    });
                }
            );
        });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ message: "Lỗi server" }); 
    }
});


// 2. POST /api/admin/auth/login (Đăng nhập Admin)
app.post("/api/admin/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) 
        return res.status(400).json({ message: "Thiếu username hoặc password" });

    db.query("SELECT id, username, password FROM admin_cred WHERE username = ?", [username], async (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        if (rows.length === 0) 
            return res.status(401).json({ message: "Sai username hoặc password Admin" });

        const adminUser = rows[0];
        bcrypt.compare(password, adminUser.password).then(match => {
            if (!match) 
                return res.status(401).json({ message: "Sai username hoặc password Admin" });

            const token = jwt.sign({ id: adminUser.id, role: 'admin' }, JWT_SECRET, { expiresIn: "7d" });
            
            res.json({ 
                message: "Đăng nhập Admin thành công", 
                token, 
                adminId: adminUser.id, 
                username: adminUser.username 
            });
        });
    });
});


/* ==========================================================
   II. ROOMS ENDPOINTS (CRUD PHÒNG)
========================================================== */

// GET /api/rooms (Read All - Chỉ lấy phòng còn trống tại thời điểm hiện tại)
app.get("/api/rooms", (req, res) => {
    // Lấy ngày hiện tại định dạng YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    const sql = `
        SELECT r.*, GROUP_CONCAT(rf.facility_id) AS facility_ids
        FROM rooms r
        LEFT JOIN room_facilities rf ON r.id = rf.room_id
        
        -- Kỹ thuật loại trừ phòng đang bận ngay hôm nay
        LEFT JOIN (
            SELECT DISTINCT b.room_id
            FROM booking_order b
            JOIN booking_details d ON b.id = d.booking_id
            WHERE 
                b.order_status IN ('confirmed', 'checked_in') 
                AND (DATE(?) BETWEEN DATE(d.check_in_date) AND DATE_SUB(DATE(d.check_out_date), INTERVAL 1 DAY))
        ) AS busy ON r.id = busy.room_id

        WHERE 
            r.status IN ('active', 'available') -- Chỉ lấy phòng đang hoạt động
            AND busy.room_id IS NULL             -- Phòng KHÔNG nằm trong danh sách bận
            
        GROUP BY r.id
        ORDER BY r.price_per_night ASC
    `;

    db.query(sql, [today], (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        res.json(rows);
    });
});

// GET /api/rooms/search
// Phiên bản "Siêu Cứng": Ép kiểu ngày tháng và in log chi tiết
app.get("/api/rooms/search", (req, res) => {
    const { checkIn, checkOut } = req.query;

    if (!checkIn || !checkOut) {
        return res.status(400).json({ message: "Vui lòng chọn ngày Check-in và Check-out" });
    }

    console.log(`\n🔍 --- DEBUG SEARCH ---`);
    console.log(`📅 Khách tìm: ${checkIn} -> ${checkOut}`);

    // LOGIC: Tìm ID các phòng đang bận, sau đó loại trừ ra.
    // Sử dụng DATE() để cắt bỏ giờ phút giây, chỉ so sánh ngày.
    
    const sql = `
        SELECT r.*, GROUP_CONCAT(rf.facility_id) AS facility_ids
        FROM rooms r
        LEFT JOIN room_facilities rf ON r.id = rf.room_id
        
        -- KỸ THUẬT ANTI-JOIN
        LEFT JOIN (
            SELECT DISTINCT b.room_id
            FROM booking_order b
            JOIN booking_details d ON b.id = d.booking_id
            WHERE 
                -- 1. CHẶN MỌI TRẠNG THÁI (Dùng TRIM và LOWER để tránh lỗi chính tả trong DB)
                TRIM(LOWER(b.order_status)) IN ('confirmed', 'checked_in', 'paid', 'success', 'booked', 'pending', 'waiting') 
            AND (
                -- 2. SO SÁNH NGÀY (Ép kiểu DATE để chính xác tuyệt đối)
                (DATE(d.check_in_date) < DATE(?) AND DATE(d.check_out_date) > DATE(?))
            )
        ) AS busy ON r.id = busy.room_id

        WHERE 
            r.status IN ('active', 'available', 'booked') 
            AND busy.room_id IS NULL -- Chỉ lấy phòng KHÔNG nằm trong danh sách bận
        
        GROUP BY r.id
        ORDER BY r.price_per_night ASC
    `;

    // In câu lệnh SQL ra để kiểm tra nếu cần (Optional)
    // console.log("SQL Query:", sql); 

    db.query(sql, [checkOut, checkIn], (err, rows) => {
        if (err) {
            console.error("❌ Lỗi Backend:", err);
            return res.status(500).json({ message: "Lỗi Server", error: err });
        }
        
        console.log(`✅ Kết quả: Tìm thấy ${rows.length} phòng trống.`);
        // In danh sách ID phòng tìm được để bạn đối chiếu
        const foundIds = rows.map(r => r.id);
        console.log(`📋 Danh sách ID phòng hiển thị: [${foundIds.join(", ")}]`);

        // Kiểm tra xem phòng bạn vừa đặt (ví dụ ID 47) có nằm trong này không
        // Nếu có -> Lỗi. Nếu không -> Code chạy đúng.
        
        res.json({
            message: "Thành công",
            count: rows.length,
            data: rows
        });
    });
});

















// GET /api/rooms/:id (Lấy chi tiết phòng - Đã sửa lỗi thiếu tiện nghi)
app.get("/api/rooms/:id", (req, res) => {
    const roomId = req.params.id;

    // 1. Lấy thông tin cơ bản của phòng
    const sqlRoom = "SELECT * FROM rooms WHERE id = ?";
    
    // 2. Lấy danh sách ảnh
    const sqlImages = "SELECT image_url, is_thumbnail FROM room_images WHERE room_id = ?";
    
    // 3. Lấy danh sách Tiện nghi (Facilities) - Truy vấn riêng biệt để không bị mất dữ liệu
    const sqlFacilities = `
        SELECT f.name 
        FROM facilities f 
        JOIN room_facilities rf ON f.id = rf.facility_id 
        WHERE rf.room_id = ?
    `;

    // 4. Lấy danh sách Đặc điểm (Features) - Truy vấn riêng biệt
    const sqlFeatures = `
        SELECT f.name 
        FROM features f 
        JOIN room_features rf ON f.id = rf.feature_id 
        WHERE rf.room_id = ?
    `;

    db.query(sqlRoom, [roomId], (err, roomRows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        if (roomRows.length === 0) return res.status(404).json({ message: "Không tìm thấy phòng" });

        const room = roomRows[0];

        // Chạy song song 3 truy vấn phụ (Ảnh, Tiện nghi, Đặc điểm)
        Promise.all([
            new Promise((resolve) => db.query(sqlImages, [roomId], (e, r) => resolve(r || []))),
            new Promise((resolve) => db.query(sqlFacilities, [roomId], (e, r) => resolve(r || []))),
            new Promise((resolve) => db.query(sqlFeatures, [roomId], (e, r) => resolve(r || [])))
        ])
        .then(([images, facilities, features]) => {
            
            // Backend tự nối mảng thành chuỗi "Wifi, Tivi, ..." để Frontend không cần sửa code cũ
            // Đảm bảo lấy đủ tất cả các dòng tìm được
            const facilitiesStr = facilities.map(item => item.name).join(', ');
            const featuresStr = features.map(item => item.name).join(', ');

            res.json({
                ...room,
                gallery: images,
                facilities: facilitiesStr, // Trả về chuỗi đầy đủ
                features: featuresStr      // Trả về chuỗi đầy đủ
            });
        })
        .catch(error => {
            console.error("Lỗi lấy chi tiết:", error);
            res.status(500).json({ message: "Lỗi server khi lấy chi tiết phòng" });
        });
    });
});

// GET /api/admin/rooms (Lấy danh sách phòng + tìm kiếm)
app.get("/api/admin/rooms", verifyAdminToken, (req, res) => {
    try {
        const keyword = req.query.search ? req.query.search.trim() : "";

        // Nếu không có từ khóa → trả về tất cả phòng
        const sql = `
            SELECT * 
            FROM rooms 
            ${keyword ? "WHERE name LIKE ?" : ""}
            ORDER BY id DESC
        `;

        const params = keyword ? [`%${keyword}%`] : [];

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("DB ERROR:", err);
                return res.status(500).json({ message: "Lỗi database", error: err });
            }

            return res.json({
                success: true,
                total: results.length,
                data: results
            });
        });

    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).json({ message: "Lỗi server", error });
    }
});


// POST /api/admin/rooms (Create New Room - Xử lý nhiều bảng)
app.post("/api/admin/rooms", verifyAdminToken, (req, res) => {
    const { name, description, price_per_night, area, max_guests, status, main_image_url, facility_ids, feature_ids, gallery_images } = req.body;

    if (!name || !price_per_night) return res.status(400).json({ message: "Thiếu thông tin cơ bản" });

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ message: "Lỗi DB transaction" });

        // 1. Chèn bảng Rooms
        const sqlRoom = "INSERT INTO rooms (name, description, price_per_night, area, max_guests, main_image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(sqlRoom, [name, description, price_per_night, area, max_guests, main_image_url, status], (errRoom, result) => {
            if (errRoom) return db.rollback(() => res.status(500).json({ message: "Lỗi thêm phòng", error: errRoom }));
            const roomId = result.insertId;

            const promises = [];

            // 2. Chèn Tiện nghi
            if (facility_ids && facility_ids.length > 0) {
                const values = facility_ids.map(id => [roomId, id]);
                promises.push(new Promise((resolve, reject) => {
                    db.query("INSERT INTO room_facilities (room_id, facility_id) VALUES ?", [values], err => err ? reject(err) : resolve());
                }));
            }

            // 3. Chèn Đặc điểm
            if (feature_ids && feature_ids.length > 0) {
                const values = feature_ids.map(id => [roomId, id]);
                promises.push(new Promise((resolve, reject) => {
                    db.query("INSERT INTO room_features (room_id, feature_id) VALUES ?", [values], err => err ? reject(err) : resolve());
                }));
            }

            // 4. Chèn Ảnh phụ (Gallery) - Nhận mảng tên file ["a.jpg", "b.jpg"]
            if (gallery_images && gallery_images.length > 0) {
                const values = gallery_images.map(imgName => [roomId, imgName, 0]);
                promises.push(new Promise((resolve, reject) => {
                    db.query("INSERT INTO room_images (room_id, image_url, is_thumbnail) VALUES ?", [values], err => err ? reject(err) : resolve());
                }));
            }

            Promise.all(promises)
                .then(() => {
                    db.commit(errCommit => {
                        if (errCommit) return db.rollback(() => res.status(500).json({ message: "Lỗi commit" }));
                        res.status(201).json({ message: "Thêm thành công", roomId });
                    });
                })
                .catch(errP => {
                    db.rollback(() => res.status(500).json({ message: "Lỗi lưu chi tiết", error: errP.message }));
                });
        });
    });
});

// PUT: Sửa phòng (Nhận JSON thuần)
app.put("/api/admin/rooms/:id", verifyAdminToken, (req, res) => {
    const roomId = req.params.id;
    const { name, description, price_per_night, area, max_guests, status, main_image_url, facility_ids, feature_ids, gallery_images } = req.body;

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ message: "Lỗi DB transaction" });

        const sqlUpdate = "UPDATE rooms SET name=?, description=?, price_per_night=?, area=?, max_guests=?, status=?, main_image_url=? WHERE id=?";
        db.query(sqlUpdate, [name, description, price_per_night, area, max_guests, status, main_image_url, roomId], (errUpd, result) => {
            if (errUpd) return db.rollback(() => res.status(500).json({ message: "Lỗi update", error: errUpd }));

            const promises = [];

            // Xóa cũ -> Thêm mới (Facilities)
            promises.push(new Promise((resolve, reject) => {
                db.query("DELETE FROM room_facilities WHERE room_id=?", [roomId], (errDel) => {
                    if (errDel) return reject(errDel);
                    if (facility_ids && facility_ids.length > 0) {
                        const values = facility_ids.map(id => [roomId, id]);
                        db.query("INSERT INTO room_facilities (room_id, facility_id) VALUES ?", [values], err => err ? reject(err) : resolve());
                    } else resolve();
                });
            }));

            // Xóa cũ -> Thêm mới (Features)
            promises.push(new Promise((resolve, reject) => {
                db.query("DELETE FROM room_features WHERE room_id=?", [roomId], (errDel) => {
                    if (errDel) return reject(errDel);
                    if (feature_ids && feature_ids.length > 0) {
                        const values = feature_ids.map(id => [roomId, id]);
                        db.query("INSERT INTO room_features (room_id, feature_id) VALUES ?", [values], err => err ? reject(err) : resolve());
                    } else resolve();
                });
            }));

            // Xóa cũ -> Thêm mới (Gallery)
            // Lưu ý: Ở đây ta xóa hết ảnh cũ và thêm lại danh sách mới client gửi lên
            promises.push(new Promise((resolve, reject) => {
                db.query("DELETE FROM room_images WHERE room_id=?", [roomId], (errDel) => {
                    if (errDel) return reject(errDel);
                    if (gallery_images && gallery_images.length > 0) {
                        const values = gallery_images.map(imgName => [roomId, imgName, 0]);
                        db.query("INSERT INTO room_images (room_id, image_url, is_thumbnail) VALUES ?", [values], err => err ? reject(err) : resolve());
                    } else resolve();
                });
            }));

            Promise.all(promises)
                .then(() => {
                    db.commit(errCommit => {
                        if (errCommit) return db.rollback(() => res.status(500).json({ message: "Lỗi commit" }));
                        res.json({ message: "Cập nhật thành công" });
                    });
                })
                .catch(errP => {
                    db.rollback(() => res.status(500).json({ message: "Lỗi cập nhật chi tiết", error: errP.message }));
                });
        });
    });
});

// DELETE /api/admin/rooms/:id (Delete Room)
app.delete("/api/admin/rooms/:id", verifyAdminToken, (req, res) => { 
    const roomId = req.params.id;
    db.query("DELETE FROM rooms WHERE id = ?", [roomId], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi DB khi xóa", error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy phòng" });
        res.json({ message: "Xóa phòng thành công" });
    });
});

/* ==========================================================
   III. CART ENDPOINTS (Đơn đặt đang chờ: booking_order + 'pending')
========================================================== */

// GET /api/cart (Lấy đơn đặt đang chờ - KHÔNG LẤY NGÀY THÁNG)
// index.js - Tìm đến route app.get("/api/cart", ...)
app.get("/api/cart", verifyToken, (req, res) => {
    const userId = req.userId;
    const sql = `
        SELECT 
            b.id AS cart_id, b.quantity,
            r.id AS room_id, r.name, r.main_image_url AS image, r.price_per_night AS price,
            ui.email -- 🚨 Lấy email trực tiếp từ database tại đây
        FROM booking_order b
        JOIN rooms r ON b.room_id = r.id
        LEFT JOIN user_info ui ON b.user_id = ui.user_id 
        WHERE b.user_id = ? AND b.order_status = 'pending'
        ORDER BY b.created_at DESC
    `;
    db.query(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Lỗi DB", error: err });
        res.json(rows);
    });
});


// index.js
// index.js
app.post("/api/cart", verifyToken, async (req, res) => {
    const userId = req.userId;
    const { room_id, quantity } = req.body;

    const query = (sql, params) => new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)));
    });

    try {
        // 1. Chặn Admin đặt phòng (Tránh lỗi khóa ngoại gây 500)
        const userCheck = await query("SELECT id FROM user_cred WHERE id = ?", [userId]);
        if (userCheck.length === 0) {
            return res.status(403).json({ message: "Admin không thể đặt phòng." });
        }

        await query("START TRANSACTION");

        // 2. Dọn đơn cũ
        const oldOrders = await query("SELECT id, room_id FROM booking_order WHERE user_id = ? AND order_status = 'pending'", [userId]);
        if (oldOrders.length > 0) {
            await query("UPDATE rooms SET status = 'available' WHERE id = ?", [oldOrders[0].room_id]);
            await query("DELETE FROM booking_order WHERE id = ?", [oldOrders[0].id]);
        }

        // 3. Đặt phòng mới
        const result = await query("UPDATE rooms SET status = 'booked' WHERE id = ? AND status = 'available'", [room_id]);
        if (result.affectedRows === 0) {
            await query("ROLLBACK");
            return res.status(400).json({ message: "Phòng bận." });
        }

        await query("INSERT INTO booking_order (user_id, room_id, quantity, order_status) VALUES (?, ?, ?, 'pending')", [userId, room_id, quantity]);
        
        await query("COMMIT");
        res.json({ message: "Thành công" });

    } catch (error) {
        try { await query("ROLLBACK"); } catch(e) {}
        console.error("Lỗi 500:", error);
        res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
    }
});
// DELETE /api/cart/:id (Xóa đơn chờ & Trả trạng thái phòng về 'available')
app.delete("/api/cart/:id", verifyToken, (req, res) => {
    const userId = req.userId;
    const cartId = req.params.id;

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ message: "Lỗi khởi tạo giao dịch" });

        // BƯỚC 1: Lấy thông tin đơn hàng để biết room_id nào cần nhả ra
        const sqlGetOrder = "SELECT room_id FROM booking_order WHERE id = ? AND user_id = ? AND order_status = 'pending'";
        db.query(sqlGetOrder, [cartId, userId], (errGet, orders) => {
            if (errGet) return db.rollback(() => res.status(500).json({ message: "Lỗi truy vấn đơn hàng" }));
            
            if (orders.length === 0) {
                return db.rollback(() => res.status(404).json({ message: "Không tìm thấy đơn đặt hàng" }));
            }

            const roomIdToRelease = orders[0].room_id;

            // BƯỚC 2: Trả phòng về trạng thái 'available'
            const sqlReleaseRoom = "UPDATE rooms SET status = 'available' WHERE id = ?";
            db.query(sqlReleaseRoom, [roomIdToRelease], (errRelease) => {
                if (errRelease) return db.rollback(() => res.status(500).json({ message: "Lỗi cập nhật trạng thái phòng" }));

                // BƯỚC 3: Xóa đơn hàng
                const sqlDelete = "DELETE FROM booking_order WHERE id = ?";
                db.query(sqlDelete, [cartId], (errDel) => {
                    if (errDel) return db.rollback(() => res.status(500).json({ message: "Lỗi xóa đơn hàng" }));

                    // BƯỚC 4: Commit
                    db.commit((errCommit) => {
                        if (errCommit) return db.rollback(() => res.status(500).json({ message: "Lỗi commit" }));
                        res.json({ message: "Đã xóa đơn và phòng đã sẵn sàng trở lại" });
                    });
                });
            });
        });
    });
});

/* ==========================================================
   IV. PAYMENTS/BOOKINGS ENDPOINTS
========================================================== */

/* ==========================================================
   VNPAY PAYMENT INTEGRATION (ĐÃ SỬA FULL LOGIC)
========================================================== */


// 1. Cấu hình VNPAY Sandbox
const frontendUrl = process.env.FRONTEND_URL || "https://frontend-nine-xi-32.vercel.app"; // URL chính thức của Frontend

const vnp_Config = {
    vnp_TmnCode: "9NUNOHFM",
    vnp_HashSecret: "PPO1LAM2IOV36MRA0659GQ996PIJELZG",
    vnp_Url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    // Sử dụng biến frontendUrl để đảm bảo chính xác
    vnp_ReturnUrl: `${frontendUrl}/payment-result`
};

function sortObject(obj) {
	let sorted = {};
	let str = [];
	let key;
	for (key in obj){
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
		    str.push(encodeURIComponent(key));
		}
	}
	str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

// 2. API Tạo URL Thanh toán (CÓ LƯU THÔNG TIN TRƯỚC)
// Thêm verifyToken để lấy được userId
// ==========================================================
// API TẠO URL VNPAY (Phiên bản Fix Lỗi 504/500 trên Vercel)
// ==========================================================

// 1. Cấu hình DB riêng cho API này (Tránh xung đột với kết nối chính)
const dbConfig = {
    host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: process.env.DB_PORT || 4000,
    user: process.env.DB_USER || '3qhZS3hkjF2gDVy.root',
    password: process.env.DB_PASS || 'ZVPPWHnjwITbQw1P',
    database: process.env.DB_NAME || 'khachsan',
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false }
};

app.post("/api/create_payment_url", verifyToken, async function (req, res) {
    const userId = req.userId;
    const { amount, bankCode, language, ...bookingInfo } = req.body;

    // 🔥 TẠO KẾT NỐI MỚI TINH (Connection)
    // Mỗi lần bấm thanh toán sẽ tạo 1 kết nối mới, dùng xong bỏ ngay
    const tempDb = mysql.createConnection(dbConfig);

    // Hàm bao bọc query để dùng await (giúp code chạy tuần tự, không bị loạn)
    const queryAsync = (sql, params) => {
        return new Promise((resolve, reject) => {
            tempDb.query(sql, params, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    };

    try {
        // Mở kết nối
        tempDb.connect((err) => {
            if (err) {
                console.error("Lỗi kết nối tempDb:", err);
                throw err;
            }
        });

        // A. TÌM ĐƠN HÀNG PENDING
        const rows = await queryAsync("SELECT id FROM booking_order WHERE user_id = ? AND order_status = 'pending' LIMIT 1", [userId]);
        
        if (rows.length === 0) {
            tempDb.end(); // Đóng kết nối ngay
            return res.status(400).json({ message: "Không tìm thấy đơn hàng chờ thanh toán" });
        }

        const orderId = rows[0].id;

        // B. LƯU THÔNG TIN KHÁCH HÀNG
        // Xóa details cũ để tránh trùng lặp
        await queryAsync("DELETE FROM booking_details WHERE booking_id = ?", [orderId]);

        // Chèn details mới
        const sqlInsertDetail = `
            INSERT INTO booking_details 
            (booking_id, check_in_date, check_out_date, client_name, client_phone, client_address, cccd, payment_method, total_price)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'vnpay', ?)
        `;
        
        await queryAsync(sqlInsertDetail, [
            orderId, 
            bookingInfo.checkIn, 
            bookingInfo.checkOut, 
            bookingInfo.name, 
            bookingInfo.phone, 
            bookingInfo.address || '', 
            bookingInfo.cccd, 
            amount
        ]);

        // C. TÍNH TOÁN URL VNPAY (Giữ nguyên logic cũ của bạn)
        process.env.TZ = 'Asia/Ho_Chi_Minh';
        let date = new Date();
        let createDate = moment(date).format('YYYYMMDDHHmmss');
        let ipAddr = req.headers['x-forwarded-for'] || '127.0.0.1';

        let tmnCode = vnp_Config.vnp_TmnCode;
        let secretKey = vnp_Config.vnp_HashSecret;
        let vnpUrl = vnp_Config.vnp_Url;
        let returnUrl = vnp_Config.vnp_ReturnUrl;

        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Locale'] = language || 'vn';
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang #' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        if (bankCode) vnp_Params['vnp_BankCode'] = bankCode;

        vnp_Params = sortObject(vnp_Params);
        let signData = qs.stringify(vnp_Params, { encode: false });
        let hmac = crypto.createHmac("sha512", secretKey);
        let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

        // 🔥 QUAN TRỌNG: Đóng kết nối trước khi trả về để tránh treo Server
        tempDb.end();

        res.json({ paymentUrl: vnpUrl });

    } catch (error) {
        console.error("Lỗi tạo URL VNPay:", error);
        try { tempDb.end(); } catch(e) {} // Cố gắng đóng kết nối nếu có lỗi
        res.status(500).json({ message: "Lỗi Server khi tạo thanh toán", error: error.message });
    }
});
// 3. API Xác thực và UPDATE DATABASE
app.get("/api/vnpay_return", function (req, res) {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);

    let secretKey = vnp_Config.vnp_HashSecret;
    let signData = qs.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");     

    if(secureHash === signed){
        if(vnp_Params['vnp_ResponseCode'] === "00") {
             // ✅ QUAN TRỌNG: CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG THÀNH CÔNG
             const orderId = vnp_Params['vnp_TxnRef'];
             
             const sqlUpdate = "UPDATE booking_order SET order_status = 'confirmed', updated_at = NOW() WHERE id = ?";
             db.query(sqlUpdate, [orderId], (err, result) => {
                 if(err) console.error("Lỗi update status:", err);
                 
                 res.json({code: '00', message: 'Giao dịch thành công', data: vnp_Params});
             });
        } else {
             res.json({code: '97', message: 'Giao dịch thất bại', data: vnp_Params});
        }
    } else {
        res.json({code: '99', message: 'Chữ ký không hợp lệ'});
    }
});
/* ==========================================================
   VNPAY PAYMENT INTEGRATION (END)
========================================================== */

// POST /api/payments - Hoàn tất thanh toán
app.post("/api/payments", verifyToken, async (req, res) => {
    const userId = req.userId;
    const { checkIn, checkOut, name, address, phone, method, cccd, totalPrice } = req.body;

    // 1. Kiểm tra đầu vào cơ bản
    if (!checkIn || !checkOut || !name || !cccd || totalPrice == null) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc (Ngày thuê, Tên, CCCD, Tổng tiền)." });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (isNaN(checkInDate) || isNaN(checkOutDate) || checkOutDate <= checkInDate) {
        return res.status(400).json({ message: "Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm." });
    }

    // Helper để chạy query bằng Promise (đã có trong index.js của bạn)
    const runQuery = (sql, params) => new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)));
    });

    try {
        // ✅ BƯỚC 1: Kiểm tra xem đây có phải tài khoản Khách hàng không (Tránh lỗi 500 khóa ngoại nếu Admin đặt)
        const userCheck = await runQuery("SELECT id FROM user_cred WHERE id = ?", [userId]);
        if (userCheck.length === 0) {
            return res.status(403).json({ message: "Tài khoản Admin không được phép thực hiện thanh toán đặt phòng." });
        }

        await runQuery("START TRANSACTION");

        // ✅ BƯỚC 2: Lấy đơn hàng đang chờ (pending)
        const orders = await runQuery(
            "SELECT id, room_id FROM booking_order WHERE user_id = ? AND order_status = 'pending' LIMIT 1",
            [userId]
        );

        if (orders.length === 0) {
            await runQuery("ROLLBACK");
            return res.status(400).json({ message: "Không tìm thấy đơn đặt đang chờ. Vui lòng thêm lại vào giỏ hàng." });
        }

        const bookingId = orders[0].id;
        const roomId = orders[0].room_id;

        // ✅ BƯỚC 3: Kiểm tra trùng lịch (Logic tối ưu: StartA < EndB AND EndA > StartB)
        const sqlOverlap = `
            SELECT d.booking_id FROM booking_details d
            JOIN booking_order b ON d.booking_id = b.id
            WHERE b.room_id = ? 
            AND b.order_status IN ('confirmed', 'checked_in')
            AND (DATE(?) < DATE(d.check_out_date) AND DATE(?) > DATE(d.check_in_date))
            LIMIT 1
        `;

        const overlaps = await runQuery(sqlOverlap, [roomId, checkOut, checkIn]);

        if (overlaps.length > 0) {
            // Nếu trùng: Trả phòng về available (vì lúc cho vào giỏ đã set thành booked)
            await runQuery("UPDATE rooms SET status = 'available' WHERE id = ?", [roomId]);
            await runQuery("ROLLBACK");
            return res.status(409).json({ 
                message: "Rất tiếc, phòng này vừa được người khác đặt trong khoảng thời gian này. Vui lòng chọn ngày khác hoặc phòng khác." 
            });
        }

        // ✅ BƯỚC 4: Chèn thông tin chi tiết
        const sqlInsertDetails = `
            INSERT INTO booking_details 
            (booking_id, check_in_date, check_out_date, client_name, client_phone, client_address, cccd, payment_method, total_price) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await runQuery(sqlInsertDetails, [
            bookingId, checkIn, checkOut, name, phone || null, address || null, cccd, method || "cash", totalPrice
        ]);

        // ✅ BƯỚC 5: Cập nhật trạng thái đơn hàng sang 'confirmed'
        await runQuery(
            "UPDATE booking_order SET order_status = 'confirmed', check_in_date = ?, check_out_date = ?, updated_at = NOW() WHERE id = ?",
            [checkIn, checkOut, bookingId]
        );

        await runQuery("COMMIT");
        res.json({ message: "Đặt phòng thành công!", paymentId: bookingId });

    } catch (error) {
        await runQuery("ROLLBACK");
        console.error("Lỗi đặt phòng:", error);
        res.status(500).json({ message: "Lỗi hệ thống khi xử lý thanh toán", error: error.message });
    }
});

// 🎯 API: GET /api/bookings/:id (Chi tiết đơn đặt phòng)
app.get("/api/bookings/:id", verifyToken, (req, res) => {
    const userId = req.userId;
    const bookingId = req.params.id; 

    // 👇 ĐÃ SỬA: Thêm dòng lấy email (ui.email) và JOIN với bảng user_info
    const sql = `
        SELECT 
            b.id AS booking_id, b.room_id, b.quantity AS num_rooms, b.created_at, b.order_status,
            r.name AS room_name, r.price_per_night, r.main_image_url AS image,
            d.check_in_date, d.check_out_date, d.client_name, d.client_phone, 
            d.client_address, d.cccd, d.payment_method, d.total_price,
            ui.email AS client_email   -- <--- LẤY THÊM EMAIL TẠI ĐÂY
        FROM booking_order b
        JOIN rooms r ON b.room_id = r.id
        JOIN booking_details d ON b.id = d.booking_id
        LEFT JOIN user_info ui ON b.user_id = ui.user_id  -- <--- KẾT NỐI BẢNG ĐỂ LẤY EMAIL
        WHERE b.id = ? AND b.user_id = ?
    `;

    db.query(sql, [bookingId, userId], (err, rows) => {
        if (err) {
            console.error("Lỗi DB khi lấy chi tiết booking:", err);
            return res.status(500).json({ message: "DB error", error: err.message });
        }
        if (rows.length === 0) {
            // Nếu không tìm thấy trong bảng chi tiết, thử tìm trong bảng order (trường hợp mới tạo chưa có detail)
            return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng này." });
        }
        res.json(rows[0]); 
    });
});

// 🚨 API MỚI: DELETE /api/bookings/:id (Hủy và xóa vĩnh viễn đơn đặt phòng)
app.delete("/api/bookings/:id", verifyToken, (req, res) => {
    const userId = req.userId;
    const bookingId = req.params.id;

    db.beginTransaction(err => {
        if (err) return res.status(500).json({ message: "DB error starting transaction" });

        // 1. KIỂM TRA & XÓA KHỎI booking_details
        const sqlDeleteDetails = "DELETE FROM booking_details WHERE booking_id = ?";
        db.query(sqlDeleteDetails, [bookingId], (errDelDetails) => {
            if (errDelDetails) {
                // Nếu không tìm thấy details, vẫn tiếp tục xóa order chính (vì order có thể là 'pending' chưa có details)
                console.warn(`Cảnh báo: Không tìm thấy booking_details cho ID ${bookingId}, tiếp tục xóa booking_order.`);
            }

            // 2. XÓA KHỎI booking_order
            const sqlDeleteOrder = "DELETE FROM booking_order WHERE id = ? AND user_id = ?";
            db.query(sqlDeleteOrder, [bookingId, userId], (errDelOrder, result) => {
                if (errDelOrder) {
                    return db.rollback(() => res.status(500).json({ message: "Lỗi DB khi xóa đơn hàng chính", error: errDelOrder }));
                }

                if (result.affectedRows === 0) {
                    // Nếu không tìm thấy order chính (hoặc không thuộc user)
                    return db.rollback(() => res.status(404).json({ message: "Không tìm thấy đơn đặt phòng hợp lệ để xóa." }));
                }

                // 3. COMMIT TRANSACTION
                db.commit(errCommit => {
                    if (errCommit) return db.rollback(() => res.status(500).json({ message: "Lỗi DB khi commit", error: errCommit }));
                    res.json({ message: "Đơn đặt phòng đã được xóa vĩnh viễn.", bookingId });
                });
            });
        });
    });
});


// GET /api/bookings (Lấy lịch sử đặt phòng: Confirmed và Checked_in)
app.get("/api/bookings", verifyToken, (req, res) => {
    const userId = req.userId;
    const sql = `
        SELECT 
            b.id AS booking_id, b.quantity AS num_rooms, b.created_at, b.order_status,
            r.name AS room_name, r.price_per_night, r.main_image_url AS image,
            d.check_in_date, d.check_out_date, d.client_name, d.cccd, d.total_price
        FROM booking_order b
        JOIN rooms r ON b.room_id = r.id
        JOIN booking_details d ON b.id = d.booking_id
        -- 🚨 SỬA TẠI ĐÂY: Lấy cả confirmed và checked_in, loại bỏ cancelled
        WHERE b.user_id = ? AND b.order_status IN ('confirmed', 'checked_in')
        ORDER BY b.created_at DESC
    `;
    db.query(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        res.json(rows);
    });
});


/* ==========================================================
    V. ADMIN ENDPOINTS (Quản lý Đơn đặt phòng)
    ========================================================== */

// 1. GET /api/admin/bookings (Lấy danh sách đơn đặt đã xác nhận cho trang Admin)
app.get("/api/admin/bookings", verifyAdminToken, (req, res) => {
    // Chỉ lấy các đơn đã 'confirmed' hoặc 'checked_in' (Giả định trạng thái confirmed là cần quản lý)
    const sql = `
        SELECT
            b.id AS booking_id,
            b.room_id,
            b.quantity AS num_rooms,
            b.created_at,
            b.check_in_date,
            b.check_out_date,
            b.order_status,
            r.name AS room_name,
            r.price_per_night,
            d.client_name AS client_name,
            d.client_phone AS client_phone,
            d.total_price
        FROM booking_order b
        JOIN rooms r ON b.room_id = r.id
        JOIN booking_details d ON b.id = d.booking_id
        JOIN user_cred u ON b.user_id = u.id 
        WHERE b.order_status IN ('confirmed', 'checked_in') 
        ORDER BY b.check_in_date DESC
    `;
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });

        // Tính toán Thời gian còn lại (Giả định: đã check-in thì mới tính)
        const formattedRows = rows.map(row => {
            const checkOut = new Date(row.check_out_date);
            const checkIn = new Date(row.check_in_date);
            const now = new Date();
            let timeRemaining = null;

            if (row.order_status === 'checked_in') {
                if (checkOut > now) {
                    const diffTime = Math.abs(checkOut - now);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    timeRemaining = `${diffDays} ngày`;
                } else {
                    timeRemaining = "Đã quá hạn trả phòng";
                }
            } else if (row.order_status === 'confirmed') {
                if (checkIn > now) {
                    timeRemaining = "Chưa đến ngày Check-in";
                } else {
                    timeRemaining = "Cần Check-in ngay";
                }
            }
            
            return {
                ...row,
                time_remaining: timeRemaining
            };
        });

        res.json(formattedRows);
    });
});

// 2. PUT /api/admin/bookings/:id/confirm (Xác nhận Check-in/Thanh toán Trả phòng)
app.put("/api/admin/bookings/:id/confirm", verifyAdminToken, async (req, res) => {
    const bookingId = req.params.id;
    const { action } = req.body;

    let newStatus;
    let successMessage;
    let releaseRoom = false;

    // 1. Phân loại hành động
    if (action === 'check_in') {
        newStatus = 'checked_in';
        successMessage = "Xác nhận Check-in thành công.";
    } else if (action === 'pay') {
        newStatus = 'paid';
        successMessage = "Xác nhận Thanh toán & Trả phòng thành công.";
        releaseRoom = true;
    } else {
        return res.status(400).json({ message: "Action không hợp lệ." });
    }

    // Hàm tiện ích để thực hiện query dạng Promise
    const query = (sql, params) => new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)));
    });

    try {
        // 2. Bắt đầu Giao dịch (Transaction)
        await query("START TRANSACTION");

        // 3. Cập nhật trạng thái đơn hàng
        const updateResult = await query(
            "UPDATE booking_order SET order_status = ?, updated_at = NOW() WHERE id = ?",
            [newStatus, bookingId]
        );

        if (updateResult.affectedRows === 0) {
            await query("ROLLBACK");
            return res.status(404).json({ message: "Không tìm thấy đơn hàng để cập nhật." });
        }

        // 4. Nếu là Thanh toán (pay), thực hiện giải phóng phòng
        if (releaseRoom) {
            const rows = await query("SELECT room_id FROM booking_order WHERE id = ?", [bookingId]);
            
            if (rows.length > 0) {
                const roomId = rows[0].room_id;
                // Cập nhật trạng thái phòng về 'available'
                await query("UPDATE rooms SET status = 'available' WHERE id = ?", [roomId]);
            }
        }

        // 5. Hoàn tất Giao dịch
        await query("COMMIT");
        res.json({ 
            message: releaseRoom ? successMessage + " Phòng đã được giải phóng." : successMessage, 
            bookingId, 
            new_status: newStatus 
        });

    } catch (error) {
        // 6. Rollback nếu có bất kỳ lỗi nào xảy ra trong quá trình
        await query("ROLLBACK");
        console.error("Lỗi xác nhận đặt phòng:", error);
        res.status(500).json({ 
            message: "Lỗi hệ thống khi xử lý giao dịch.", 
            error: error.message 
        });
    }
});

// 3. DELETE /api/admin/bookings/:id/cancel (Hủy đơn đặt phòng)
app.delete("/api/admin/bookings/:id/cancel", verifyAdminToken, (req, res) => {
    const bookingId = req.params.id;

    db.query("UPDATE booking_order SET order_status = 'cancelled', updated_at = NOW() WHERE id = ?", 
    [bookingId], (err, result) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng" });
        
        res.json({ message: "Đã Hủy Đơn Đặt Phòng thành công", bookingId });
    });
});
/* ==========================================================
   IV. ADMIN CRUD ENDPOINTS (Cấu hình: Facilities & Features)
========================================================== */

// --- 4.1 CRUD cho FACILITIES (Tiện nghi) ---
app.get("/api/admin/facilities", (req, res) => {
    db.query("SELECT * FROM facilities ORDER BY name", (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        res.json(rows);
    });
});
app.post("/api/admin/facilities", verifyAdminToken, (req, res) => { 
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Thiếu tên tiện nghi" });
    db.query("INSERT INTO facilities (name) VALUES (?)", [name], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi DB khi thêm", error: err });
        res.status(201).json({ message: "Thêm tiện nghi thành công", id: result.insertId });
    });
});
app.put("/api/admin/facilities/:id", verifyAdminToken, (req, res) => { 
    const { name } = req.body;
    const id = req.params.id;
    if (!name) return res.status(400).json({ message: "Thiếu tên tiện nghi" });
    db.query("UPDATE facilities SET name = ? WHERE id = ?", [name, id], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi DB khi sửa", error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy tiện nghi" });
        res.json({ message: "Cập nhật tiện nghi thành công" });
    });
});
app.delete("/api/admin/facilities/:id", verifyAdminToken, (req, res) => { 
    const id = req.params.id;
    db.query("DELETE FROM facilities WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi DB khi xóa", error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy tiện nghi" });
        res.json({ message: "Xóa tiện nghi thành công" });
    });
});

// --- 4.2 CRUD cho FEATURES (Đặc điểm) ---
app.get("/api/admin/features", (req, res) => {
    db.query("SELECT * FROM features ORDER BY name", (err, rows) => {
        if (err) return res.status(500).json({ message: "DB error", error: err });
        res.json(rows);
    });
});
app.post("/api/admin/features", verifyAdminToken, (req, res) => { 
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Thiếu tên đặc điểm" });
    db.query("INSERT INTO features (name) VALUES (?)", [name], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi DB khi thêm", error: err });
        res.status(201).json({ message: "Thêm đặc điểm thành công", id: result.insertId });
    });
});
app.put("/api/admin/features/:id", verifyAdminToken, (req, res) => { 
    const { name } = req.body;
    const id = req.params.id;
    if (!name) return res.status(400).json({ message: "Thiếu tên đặc điểm" });
    db.query("UPDATE features SET name = ? WHERE id = ?", [name, id], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi DB khi sửa", error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy đặc điểm" });
        res.json({ message: "Cập nhật đặc điểm thành công" });
    });
});
app.delete("/api/admin/features/:id", verifyAdminToken, (req, res) => { 
    const id = req.params.id;
    db.query("DELETE FROM features WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi DB khi xóa", error: err });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Không tìm thấy đặc điểm" });
        res.json({ message: "Xóa đặc điểm thành công" });
    });
});
// Thêm đoạn code này vào file Express Backend của bạn (trong phần ADMIN ENDPOINTS)

// 🚨 API MỚI: GET /api/admin/dashboard/stats (Lấy tất cả số liệu thống kê)
// index.js

// Tìm đến route app.get("/api/admin/dashboard/stats", ...)
app.get("/api/admin/dashboard/stats", verifyAdminToken, (req, res) => {
    
    // 1. Tổng số Khách hàng
    const countUsers = "SELECT COUNT(id) AS total_users FROM user_cred";
    // 2. Tổng số Phòng
    const countRooms = "SELECT COUNT(id) AS total_rooms FROM rooms";
    // 3. Tổng số Tiện nghi
    const countFacilities = "SELECT COUNT(id) AS total_facilities FROM facilities";

    // 🚨 FIX TẠI ĐÂY: Cộng thêm các đơn có trạng thái rỗng hoặc NULL
    const totalRevenue = `
        SELECT COALESCE(SUM(d.total_price), 0) AS total_revenue 
        FROM booking_order b 
        JOIN booking_details d ON b.id = d.booking_id 
        WHERE (b.order_status IN ('confirmed', 'paid', 'checked_in', 'success') 
           OR b.order_status IS NULL 
           OR b.order_status = '')
    `;

    // 5. Số đơn hàng mới
    const newBookings = "SELECT COUNT(id) AS new_bookings FROM booking_order WHERE order_status = 'confirmed'"; 

    Promise.all([
        new Promise((resolve, reject) => db.query(countUsers, (err, rows) => err ? reject(err) : resolve(rows[0]))),
        new Promise((resolve, reject) => db.query(countRooms, (err, rows) => err ? reject(err) : resolve(rows[0]))),
        new Promise((resolve, reject) => db.query(countFacilities, (err, rows) => err ? reject(err) : resolve(rows[0]))),
        new Promise((resolve, reject) => db.query(totalRevenue, (err, rows) => err ? reject(err) : resolve(rows[0]))),
        new Promise((resolve, reject) => db.query(newBookings, (err, rows) => err ? reject(err) : resolve(rows[0]))),
    ])
    .then(results => {
        const stats = {
            totalUsers: results[0].total_users,
            totalRooms: results[1].total_rooms,
            totalFacilities: results[2].total_facilities,
            totalRevenue: parseFloat(results[3].total_revenue), 
            newBookings: results[4].new_bookings,
        };
        res.json(stats);
    })
    .catch(dbErr => {
        console.error("Lỗi lấy Dashboard Stats:", dbErr);
        res.status(500).json({ message: "DB error", error: dbErr.message });
    });
});
// Thêm đoạn code này vào file Express Backend của bạn (trong phần ADMIN ENDPOINTS)

// 🚨 API MỚI: GET /api/admin/bookings/pending (Lấy danh sách đơn đặt đang chờ xử lý)
app.get("/api/admin/bookings/pending", verifyAdminToken, (req, res) => {
    
    // Truy vấn join giữa booking_order (để lấy trạng thái pending), rooms và user_info/user_cred
    const sql = `
        SELECT 
            b.id AS booking_id,
            b.room_id,
            b.quantity AS num_rooms,
            b.created_at,
            r.name AS room_name,
            r.price_per_night,
            r.main_image_url AS room_image,
            u.username AS client_username,
            ui.email AS client_email,
            b.order_status
        FROM booking_order b
        JOIN rooms r ON b.room_id = r.id
        JOIN user_cred u ON b.user_id = u.id
        LEFT JOIN user_info ui ON u.id = ui.user_id 
        WHERE b.order_status = 'pending'
        ORDER BY b.created_at DESC
    `;
    
    db.query(sql, (err, rows) => {
        if (err) {
            console.error("Lỗi DB khi lấy đơn đặt Pending:", err);
            return res.status(500).json({ message: "DB error", error: err });
        }

        const formattedRows = rows.map(row => {
            // Giả định đơn pending là đơn đặt 1 đêm (hoặc tính giá cơ bản)
            const estimatedPrice = row.price_per_night * row.num_rooms; 
            
            return {
                ...row,
                estimated_price: estimatedPrice,
                // Giả định ngày đặt là ngày hiện tại vì đơn pending chưa chọn ngày thuê chính thức
                check_in_date_temp: "Chưa xác định", 
                duration: "Chưa xác định"
            };
        });

        res.json(formattedRows);
    });
});
app.get("/api/admin/bookings/history", verifyAdminToken, (req, res) => {
    const sql = `
        SELECT 
            b.id AS booking_id,
            b.room_id,
            b.quantity AS num_rooms,
            b.created_at,
            b.updated_at,
            b.order_status,
            r.name AS room_name,
            r.price_per_night,
            d.client_name,
            d.client_phone,
            d.check_in_date,
            d.check_out_date,
            d.total_price
        FROM booking_order b
        JOIN rooms r ON b.room_id = r.id
        LEFT JOIN booking_details d ON b.id = d.booking_id
        -- 🚨 ĐIỀU CHỈNH QUAN TRỌNG: Thêm 'paid' để thấy được các đơn vừa xác nhận trả phòng
        WHERE b.order_status IN ('cancelled', 'paid', '') OR b.order_status IS NULL
        ORDER BY b.updated_at DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error("Lỗi DB khi lấy lịch sử đặt phòng:", err);
            return res.status(500).json({ message: "DB error", error: err });
        }

        const formattedRows = rows.map(row => {
            let duration = 'N/A';

            // 1. Tính số ngày ở cho các đơn đã thanh toán thành công
            if (row.check_in_date && row.check_out_date && row.order_status === 'paid') {
                const checkIn = new Date(row.check_in_date);
                const checkOut = new Date(row.check_out_date);
                const diffTime = Math.abs(checkOut - checkIn);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                duration = `${diffDays} ngày (Đã xong)`;
            } 
            // 2. Trạng thái hủy
            else if (row.order_status === 'cancelled') {
                duration = 'Đã hủy';
            } 
            // 3. Xử lý các đơn có trạng thái trống (từ dữ liệu lỗi cũ)
            else if (!row.order_status || row.order_status === '') {
                duration = 'Chưa xác định';
            }

            return {
                ...row,
                duration
            };
        });

        res.json(formattedRows);
    });
});
// TRONG FILE INDEX.JS HOẶC APP.JS

// ==========================================================
// THIẾT LẬP CHUNG (CẦN CÓ)
// ==========================================================
// Giả định: db (đối tượng kết nối MySQL), bcrypt, jwt, SALT_ROUNDS, verifyAdminToken đã được định nghĩa.

// Hàm Promisify db.query
const dbQueryAsync = (sql, values) => new Promise((resolve, reject) => {
    // SỬA: Thay thế 'db' bằng đối tượng kết nối MySQL thực tế của bạn
    db.query(sql, values, (err, result) => { 
        if (err) return reject(err);
        resolve(result);
    });
});

// Hàm Fetch dữ liệu User hiện tại (cũ) - Dùng trong PUT
const fetchCurrentUser = async (userId) => {
    const sql = `
        SELECT 
            c.username, 
            i.email,
            i.name,         /* FIX: Lấy tên cột chính xác là 'name' */
            i.phone
        FROM user_cred c
        LEFT JOIN user_info i ON c.id = i.user_id
        WHERE c.id = ?
    `;
    const result = await dbQueryAsync(sql, [userId]);
    // Trả về đối tượng user hoặc undefined.
    return result[0] ? result[0] : undefined; 
};



/* ==========================================================
 VI. ADMIN CRUD ENDPOINTS 
 ========================================================== */

// 1. GET /api/admin/users
app.get("/api/admin/users", verifyAdminToken, async (req, res) => {
    const sql = `
        SELECT 
            c.id, 
            c.username, 
            c.status,           
            i.email,
            i.name,             
            i.phone             
        FROM user_cred c
        LEFT JOIN user_info i ON c.id = i.user_id
        ORDER BY c.id DESC
    `;
    try {
        const rows = await dbQueryAsync(sql);
        const usersWithStatus = rows.map(user => ({
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            full_name: user.name, 
            isActive: user.status === 'active' 
        }));
        res.json(usersWithStatus);
    } catch (err) {
        console.error("Lỗi DB khi lấy danh sách user:", err);
        return res.status(500).json({ message: "DB error", error: err.message });
    }
});


// ==========================================================
// API GỘP: CẬP NHẬT THÔNG TIN & TRẠNG THÁI (ACTIVE/INACTIVE)
// PUT /api/admin/users/:id
// ==========================================================
app.put("/api/admin/users/:id", verifyAdminToken, async (req, res) => {
    const userId = req.params.id;
    // Nhận tất cả các trường: username, password, info... VÀ isActive
    const { username, password, full_name, email, phone, isActive } = req.body; 

    // Kiểm tra xem có dữ liệu nào được gửi lên không
    if (!username && !password && full_name === undefined && email === undefined && phone === undefined && isActive === undefined) {
        return res.status(400).json({ message: "Thiếu dữ liệu cần cập nhật." });
    }

    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ message: "DB error starting transaction" });

        try {
            // 1. Lấy thông tin user hiện tại để so sánh
            const currentUser = await fetchCurrentUser(userId);
            if (!currentUser) throw new Error("User không tồn tại.");

            const currentAdminId = req.user?.id || req.userId; // Lấy ID admin đang đăng nhập

            // 2. Xử lý STATUS (Nếu có gửi isActive)
            let newStatus = undefined;
            if (isActive !== undefined) {
                // Chuyển đổi sang boolean cho chắc chắn
                const isActiveBool = String(isActive) === 'true' || isActive === true;
                
                // BẢO VỆ: Không cho phép Admin tự vô hiệu hóa chính mình
                if (!isActiveBool && String(userId) === String(currentAdminId)) {
                     return db.rollback(() =>
                         res.status(403).json({ message: "Bạn không thể vô hiệu hóa tài khoản Admin hiện tại của chính mình." })
                     );
                }
                
                newStatus = isActiveBool ? 'active' : 'inactive';
            }

            // =======================================================
            // BƯỚC 1: KIỂM TRA TRÙNG LẶP (Username & Email)
            // =======================================================
            
            if (username && username !== currentUser.username) {
                const checkUserSql = "SELECT id FROM user_cred WHERE username = ? AND id != ?";
                const existingUser = await dbQueryAsync(checkUserSql, [username, userId]);
                if (existingUser && existingUser.length > 0) throw new Error("Tên người dùng đã tồn tại.");
            }
            
            let finalEmail = undefined;
            if (email !== undefined) {
                finalEmail = email ? email.trim() : null;
                if (finalEmail !== currentUser.email && finalEmail !== null) {
                    const checkEmailSql = "SELECT user_id FROM user_info WHERE email = ? AND user_id != ?";
                    const existingEmail = await dbQueryAsync(checkEmailSql, [finalEmail, userId]);
                    if (existingEmail && existingEmail.length > 0) throw new Error("Địa chỉ email đã được sử dụng.");
                }
            }

            // ==================================
            // BƯỚC 2: THỰC THI UPDATE
            // ==================================
            
            // A. Update bảng user_cred (Username, Password, Status)
            let credUpdates = [];
            let credValues = [];

            if (username && username !== currentUser.username) {
                credUpdates.push("username = ?");
                credValues.push(username.trim());
            }
            if (password) {
                const hash = await bcrypt.hash(password, SALT_ROUNDS);
                credUpdates.push("password = ?");
                credValues.push(hash);
            }
            // Tích hợp update Status vào đây
            if (newStatus !== undefined && newStatus !== currentUser.status) {
                 credUpdates.push("status = ?");
                 credValues.push(newStatus);
            }

            if (credUpdates.length > 0) {
                const sqlCred = `UPDATE user_cred SET ${credUpdates.join(", ")} WHERE id = ?`;
                await dbQueryAsync(sqlCred, [...credValues, userId]);
            }

            // B. Update bảng user_info (Name, Email, Phone)
            let infoData = {};
            if (full_name !== undefined) {
                const cleanName = full_name.trim() === '' ? null : full_name.trim();
                if (cleanName !== currentUser.name) infoData.name = cleanName;
            }
            if (phone !== undefined) {
                const cleanPhone = phone.trim() === '' ? null : phone.trim();
                if (cleanPhone !== currentUser.phone) infoData.phone = cleanPhone;
            }
            if (finalEmail !== undefined && finalEmail !== currentUser.email) {
                infoData.email = finalEmail;
            }

            let infoUpdates = [];
            let infoValues = [];
            Object.keys(infoData).forEach((key) => {
                infoUpdates.push(`${key} = ?`);
                infoValues.push(infoData[key]); 
            });

            if (infoUpdates.length > 0) {
                const columns = infoUpdates.map((u) => u.split(" ")[0]);
                const sqlInfo = `
                    INSERT INTO user_info (user_id, ${columns.join(", ")})
                    VALUES (?, ${columns.map(() => "?").join(", ")})
                    ON DUPLICATE KEY UPDATE ${infoUpdates.join(", ")}
                `;
                await dbQueryAsync(sqlInfo, [userId, ...infoValues, ...infoValues]);
            }

            // Nếu không có gì thay đổi cả
            if (credUpdates.length === 0 && infoUpdates.length === 0) {
                 return db.rollback(() => res.status(200).json({ message: "Không có thay đổi nào cần cập nhật.", userId }));
            }

            // COMMIT
            db.commit((errCommit) => {
                if (errCommit) return db.rollback(() => res.status(500).json({ message: "Lỗi commit", error: errCommit.message }));
                res.json({ message: "Cập nhật thành công", userId });
            });

        } catch (e) {
            db.rollback(() => {
                console.error("UPDATE ERROR:", e);
                const msg = e.message.includes("tồn tại") || e.message.includes("sử dụng") ? e.message : "Lỗi hệ thống khi cập nhật.";
                res.status(500).json({ message: msg, error: e.message });
            });
        }
    });
});


// 4. DELETE /api/admin/users/:id (Xóa User và dữ liệu liên quan)
app.delete("/api/admin/users/:id", verifyAdminToken, async (req, res) => {
    const userId = req.params.id;

    db.beginTransaction(async (err) => {
        if (err) return res.status(500).json({ message: "DB error starting transaction" });

        try {
            // Xóa booking_details (bảng con) qua subquery
            const sqlDeleteDetails = `
                DELETE FROM booking_details 
                WHERE booking_id IN (
                    SELECT id FROM booking_order WHERE user_id = ?
                )
            `;
            await dbQueryAsync(sqlDeleteDetails, [userId]); 

            // Xóa các bảng phụ TRỰC TIẾP trỏ đến user_cred
            const directDeleteMap = [
                { table: "booking_order", fk_column: "user_id" }, 
                { table: "user_info", fk_column: "user_id" }, 
            ];

            for (const item of directDeleteMap) {
                const sql = `DELETE FROM ${item.table} WHERE ${item.fk_column} = ?`;
                await dbQueryAsync(sql, [userId]);
            }

            // Xóa user chính (user_cred)
            const sqlUser = "DELETE FROM user_cred WHERE id = ?";
            const result = await dbQueryAsync(sqlUser, [userId]);

            if (result.affectedRows === 0) {
                return db.rollback(() => res.status(404).json({ message: "User không tồn tại." }));
            }

            // COMMIT TRANSACTION
            db.commit((errCommit) => {
                if (errCommit) {
                    return db.rollback(() =>
                        res.status(500).json({ message: "Lỗi commit transaction", error: errCommit.message })
                    );
                }
                res.json({ message: "Xóa user thành công", userId });
            });
        } catch (e) {
            // ROLLBACK VÀ TRẢ VỀ LỖI
            db.rollback(() => {
                console.error("Lỗi giao dịch xóa user cuối cùng:", e);
                res.status(500).json({ 
                    message: "Lỗi khi xóa user và dữ liệu liên quan. Vui lòng kiểm tra log server.", 
                    error: e.message
                });
            });
        }
    });
});
// 5.1 GET: Lấy danh sách đánh giá theo Room ID (ĐÃ CẬP NHẬT LẤY TÊN)
app.get("/api/reviews/room/:roomId", (req, res) => {
    const roomId = req.params.roomId;
    
    // Query này JOIN với bảng user_cred và user_info để lấy tên
    const sql = `
        SELECT r.*, u.username, i.name AS full_name
        FROM rating_review r
        JOIN user_cred u ON r.user_id = u.id
        LEFT JOIN user_info i ON u.id = i.user_id
        WHERE r.room_id = ? 
        ORDER BY r.created_at DESC
    `;

    db.query(sql, [roomId], (err, rows) => {
        if (err) return res.status(500).json({ message: "Lỗi DB", error: err });
        res.json(rows);
    });
});
// --- THÊM ĐOẠN NÀY VÀO index.js ---

// GET /api/admin/reviews (Lấy tất cả đánh giá để Admin xem)
app.get("/api/admin/reviews", verifyAdminToken, (req, res) => {
    // Câu lệnh SQL: Lấy thông tin review + tên phòng + tên khách hàng
    const sql = `
        SELECT 
            r.id, 
            r.rating_point, 
            r.review_text, 
            r.created_at,
            rm.name AS room_name,
            u.username,
            i.name AS full_name
        FROM rating_review r
        JOIN rooms rm ON r.room_id = rm.id
        JOIN user_cred u ON r.user_id = u.id
        LEFT JOIN user_info i ON u.id = i.user_id
        ORDER BY r.created_at DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            console.error("Lỗi lấy danh sách review:", err);
            return res.status(500).json({ message: "Lỗi DB", error: err });
        }
        res.json(rows);
    });
});

// 5.2 POST: Thêm đánh giá mới (CHỈ CHO PHÉP NẾU ĐÃ ĐẶT PHÒNG)
app.post("/api/reviews", verifyToken, (req, res) => {
    const { room_id, rating_point, review_text } = req.body;

    // Lấy user_id chuẩn từ token
    const user_id = (req.user && req.user.id) ? req.user.id : req.userId;

    if (!user_id) return res.status(401).json({ message: "Chưa đăng nhập." });
    if (!room_id || !rating_point) return res.status(400).json({ message: "Thiếu thông tin đánh giá." });

    // BƯỚC 1: KIỂM TRA LỊCH SỬ ĐẶT PHÒNG
    // Chỉ cho phép đánh giá nếu user đã có đơn hàng ở trạng thái: confirmed, checked_in, paid, success
    const sqlCheckBooking = `
        SELECT id 
        FROM booking_order 
        WHERE user_id = ? 
        AND room_id = ? 
        AND order_status IN ('confirmed', 'checked_in', 'paid', 'success')
        LIMIT 1
    `;

    db.query(sqlCheckBooking, [user_id, room_id], (errCheck, rows) => {
        if (errCheck) {
            console.error("Lỗi kiểm tra booking:", errCheck);
            return res.status(500).json({ message: "Lỗi hệ thống khi kiểm tra quyền đánh giá." });
        }

        // Nếu không tìm thấy đơn đặt phòng hợp lệ
        if (rows.length === 0) {
            return res.status(403).json({ 
                message: "Bạn chưa trải nghiệm phòng này (hoặc đơn chưa được xác nhận), nên không thể đánh giá." 
            });
        }

        // BƯỚC 2: NẾU HỢP LỆ -> LƯU ĐÁNH GIÁ
        const sqlInsert = "INSERT INTO rating_review (room_id, user_id, rating_point, review_text, created_at) VALUES (?, ?, ?, ?, NOW())";
        
        db.query(sqlInsert, [room_id, user_id, rating_point, review_text], (err, result) => {
            if (err) {
                console.error("Lỗi thêm review:", err);
                return res.status(500).json({ message: "Lỗi khi lưu đánh giá", error: err });
            }
            
            res.status(201).json({ 
                message: "Cảm ơn bạn! Đánh giá đã được đăng thành công.", 
                id: result.insertId,
                data: { room_id, user_id, rating_point, review_text }
            });
        });
    });
});

// 5.3 PUT: Sửa đánh giá
app.put("/api/reviews/:id", verifyToken, (req, res) => {
    const reviewId = req.params.id;
    const userId = req.user.id || req.user.userId;
    const { rating_point, review_text } = req.body;

    const sql = `
        UPDATE rating_review 
        SET rating_point = ?, review_text = ? 
        WHERE id = ? AND user_id = ?
    `;

    db.query(sql, [rating_point, review_text, reviewId, userId], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi DB khi sửa", error: err });
        
        if (result.affectedRows === 0) {
            return res.status(403).json({ message: "Không tìm thấy đánh giá hoặc bạn không có quyền sửa" });
        }

        res.json({ message: "Cập nhật đánh giá thành công" });
    });
});

// 5.4 DELETE: Xóa đánh giá
app.delete("/api/reviews/:id", verifyToken, (req, res) => {
    const reviewId = req.params.id;
    const userId = req.user.id || req.user.userId;
    const isAdmin = req.user.role === 'admin'; 

    let sql = "";
    let params = [];

    if (isAdmin) {
        sql = "DELETE FROM rating_review WHERE id = ?";
        params = [reviewId];
    } else {
        sql = "DELETE FROM rating_review WHERE id = ? AND user_id = ?";
        params = [reviewId, userId];
    }

    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi DB khi xóa", error: err });

        if (result.affectedRows === 0) {
            return res.status(403).json({ message: "Không xóa được (Không tìm thấy hoặc không có quyền)" });
        }

        res.json({ message: "Xóa đánh giá thành công" });
    });
});

/* ==========================================================
   API TÌM KIẾM PHÒNG NÂNG CAO (PHIÊN BẢN FIX TRIỆT ĐỂ)
   GET /api/rooms/search/advanced

========================================================== */
app.get("/api/rooms/search/advanced", (req, res) => {
    const { checkIn, checkOut, maxPrice, guests } = req.query;
    const queryParams = [];

    // Lấy các phòng đang hoạt động
    let sql = `SELECT r.* FROM rooms r WHERE r.status IN ('active', 'available', 'booked') `;

    // Lọc ngày trống: Phòng KHÔNG được có đơn đặt nào trùng vào khoảng ngày này
    if (checkIn && checkOut) {
        sql += `
            AND NOT EXISTS (
                SELECT 1 FROM booking_order b
                JOIN booking_details d ON b.id = d.booking_id
                WHERE b.room_id = r.id
                AND b.order_status IN ('confirmed', 'checked_in', 'paid')
                AND (DATE(?) < DATE(d.check_out_date) AND DATE(?) > DATE(d.check_in_date))
            )
        `;
        queryParams.push(checkIn, checkOut); 
    }

    if (maxPrice) {
        sql += " AND r.price_per_night <= ?";
        queryParams.push(parseFloat(maxPrice));
    }

    if (guests) {
        sql += " AND r.max_guests >= ?";
        queryParams.push(parseInt(guests));
    }

    sql += " ORDER BY r.price_per_night ASC";

    db.query(sql, queryParams, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows); // Trả về mảng trực tiếp cho Frontend dễ map
    });
});

app.post("/api/chatbot", async (req, res) => {
    try {
        const userMessage = req.body.message;
        if (!userMessage || typeof userMessage !== 'string') return res.json({ reply: "Tin nhắn lỗi." });

        const lowerMessage = userMessage.toLowerCase().trim();
        const searchKeywords = ["tìm", "còn phòng", "phòng", "giá", "đặt", "thuê", "xem"];
        const isLookingForRoom = searchKeywords.some(k => lowerMessage.includes(k));

        if (isLookingForRoom) {
            
            let maxPrice = null;
            let guests = 1; 
            let nameKeyword = "";

            // --- 1. XỬ LÝ GIÁ ---
            if (lowerMessage.includes("dưới 500") || lowerMessage.includes("500k")) maxPrice = 500000;
            else if (lowerMessage.includes("dưới 1 triệu") || lowerMessage.includes("1tr")) maxPrice = 1000000;
            else if (lowerMessage.includes("dưới 2 triệu") || lowerMessage.includes("2tr")) maxPrice = 2000000;
            else if (lowerMessage.includes("dưới 3 triệu") || lowerMessage.includes("3tr")) maxPrice = 3000000;

            // --- 2. XỬ LÝ SỐ NGƯỜI ---
            const guestMatch = lowerMessage.match(/(\d+)\s*(khách|người|ng)/) || lowerMessage.match(/cho\s*(\d+)/);
            if (guestMatch) guests = parseInt(guestMatch[1]);

            // --- 3. XỬ LÝ TÊN PHÒNG ---
            const detailedMatch = lowerMessage.match(/phòng\s+([a-zA-Z0-9à-ỹ\s]+)/);
            if (detailedMatch) {
                let potentialName = detailedMatch[1].trim();
                const stopWords = ["giá", "dưới", "trên", "tầm", "khoảng", "cho", "có", "tại", "ở", "là"];
                let words = potentialName.split(" ");
                let cleanWords = [];
                for (let word of words) {
                    if (stopWords.includes(word)) break;
                    cleanWords.push(word);
                }
                nameKeyword = cleanWords.join(" ").trim();
            }

            if (!nameKeyword) {
                if (lowerMessage.includes("vip")) nameKeyword = "VIP";
                else if (lowerMessage.includes("deluxe")) nameKeyword = "Deluxe";
                else if (lowerMessage.includes("standard")) nameKeyword = "Standard";
                else if (lowerMessage.includes("family")) nameKeyword = "Family";
                else if (lowerMessage.includes("double")) nameKeyword = "Double";
                else if (lowerMessage.includes("single")) nameKeyword = "Single";
            }

            // --- 4. TẠO SQL QUERY ---
            let sql = `SELECT id, name, price_per_night, max_guests, description 
                       FROM rooms 
                       WHERE status IN ('available', 'active')`;
            let params = [];

            if (maxPrice) { sql += " AND price_per_night <= ?"; params.push(maxPrice); }
            sql += " AND max_guests >= ?"; params.push(guests);

            if (nameKeyword) {
                sql += " AND name LIKE ?";
                params.push(`%${nameKeyword}%`);
                sql += ` ORDER BY CASE WHEN name = ? THEN 1 ELSE 2 END, price_per_night ASC`;
                params.push(nameKeyword);
            } else {
                sql += " ORDER BY price_per_night ASC";
            }
            
            // Tăng LIMIT hoặc bỏ LIMIT để lấy toàn bộ danh sách phù hợp
            sql += " LIMIT 50"; 

            // --- 5. GỌI DATABASE ---
            try {
                const executeQuery = (query, args) => {
                    return new Promise((resolve, reject) => {
                        if (!db) return reject(new Error("No DB Connection"));
                        db.query(query, args, (err, rows) => {
                            if (err) return reject(err);
                            resolve(rows);
                        });
                    });
                };
                const rows = await executeQuery(sql, params);

                if (!rows || rows.length === 0) {
                     return res.json({ reply: `Không tìm thấy phòng nào phù hợp với yêu cầu của bạn.` });
                }

                // --- 6. LOGIC LỌC KẾT QUẢ ---
                let finalRooms = rows;
                let isExactFound = false;

                if (nameKeyword) {
                    const exactMatchRoom = rows.find(r => r.name.toLowerCase() === nameKeyword.toLowerCase());
                    if (exactMatchRoom) {
                        finalRooms = [exactMatchRoom];
                        isExactFound = true;
                    } 
                    // ĐÃ XÓA: Phần slice(0, 3) để không bị giới hạn số lượng hiện ra
                }

                // --- 7. TRẢ VỀ JSON ---
                let reply = "";
                
                if (isExactFound) {
                    const room = finalRooms[0];
                    reply += `🎯 **Tìm thấy chính xác phòng ${room.name}!**\n`;
                    reply += `💰 Giá: ${parseFloat(room.price_per_night).toLocaleString()} đ/đêm\n`;
                    reply += `👥 Tối đa: ${room.max_guests} người\n`;
                    reply += `👉 [XEM CHI TIẾT & ĐẶT NGAY](/rooms/${room.id})`; 
                } else {
                    reply += `✅ Tìm thấy ${rows.length} phòng phù hợp:\n\n`;
                    
                    // Lặp qua tất cả phòng trong finalRooms
                    finalRooms.forEach(room => {
                        reply += `🏨 **${room.name}**\n💰 ${parseFloat(room.price_per_night).toLocaleString()} đ/đêm\n🔗 [Xem chi tiết](/rooms/${room.id})\n\n`;
                    });
                    
                    // ĐÃ XÓA: Dòng chữ "...và các phòng khác"
                }

                return res.json({ reply });

            } catch (err) {
                console.error(err);
                return res.json({ reply: "Lỗi kết nối cơ sở dữ liệu." });
            }

        } else {
            // Logic Gemini cho các câu hỏi thông thường
            try {
                const prompt = `Bạn là lễ tân khách sạn thân thiện. Trả lời ngắn gọn câu hỏi sau: "${userMessage}"`;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return res.json({ reply: response.text() });
            } catch (e) { return res.json({ reply: "Xin lỗi, tôi gặp chút trục trặc. Bạn cần hỏi gì về phòng ốc không?" }); }
        }
    } catch (e) {
        res.status(500).json({ reply: "Lỗi hệ thống Server." });
    }
});
/* ==========================
   START SERVER
========================== */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
