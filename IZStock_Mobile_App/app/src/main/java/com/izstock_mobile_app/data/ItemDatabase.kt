package com.izstock_mobile_app.data


import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import androidx.core.database.sqlite.transaction

class ItemDatabase(context: Context) :
    SQLiteOpenHelper(context, "izstock_index.db", null, 1) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """CREATE TABLE items (
                sku TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                name_lower TEXT NOT NULL COLLATE NOCASE,
                price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                shelf_id TEXT,
                aisle_number TEXT,
                image_url TEXT
            )"""
        )
        db.execSQL("CREATE INDEX idx_items_name_lower ON items(name_lower)")
    }

    // this is only a cache, so on a schema change just rebuild it
    override fun onUpgrade(db: SQLiteDatabase, old: Int, new: Int) {
        db.execSQL("DROP TABLE IF EXISTS items")
        onCreate(db)
    }

    fun count(): Int =
        readableDatabase.rawQuery("SELECT COUNT(*) FROM items", null).use {
            it.moveToFirst(); it.getInt(0)
        }

    /** Swaps the whole index in one transaction: a failure leaves the old data intact. */
    fun replaceAll(items: List<Item>) {
        val db = writableDatabase
        db.transaction {
            try {
                delete("items", null, null)
                val stmt = compileStatement(
                    "INSERT OR REPLACE INTO items " +
                            "(sku, name, name_lower, price, quantity, shelf_id, aisle_number, image_url) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                )
                items.forEach { i ->
                    stmt.clearBindings()
                    stmt.bindString(1, i.sku)
                    stmt.bindString(2, i.name)
                    stmt.bindString(3, i.name.lowercase())
                    stmt.bindDouble(4, i.price)
                    stmt.bindLong(5, i.quantity.toLong())
                    i.shelfId?.let { stmt.bindString(6, it) }
                    i.aisleNumber?.let { stmt.bindString(7, it) }
                    i.imageUrl?.let { stmt.bindString(8, it) }
                    stmt.executeInsert()
                }
            } finally {
            }
        }
    }

    // names that start with the query come first
    fun suggest(query: String, limit: Int): List<Item> {
        val q = query.trim().lowercase()
            .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        val sql = """
            SELECT sku, name, price, quantity, shelf_id, aisle_number, image_url
            FROM items
            WHERE name_lower LIKE ? ESCAPE '\' OR sku LIKE ? ESCAPE '\'
            ORDER BY CASE WHEN name_lower LIKE ? ESCAPE '\' THEN 0 ELSE 1 END, name_lower
            LIMIT ?"""
        val args = arrayOf("%$q%", "$q%", "$q%", limit.toString())
        return readableDatabase.rawQuery(sql, args).use { c ->
            buildList {
                while (c.moveToNext()) add(
                    Item(
                        sku = c.getString(0),
                        name = c.getString(1),
                        price = c.getDouble(2),
                        quantity = c.getInt(3),
                        shelfId = c.getString(4),
                        aisleNumber = c.getString(5),
                        imageUrl = c.getString(6)
                    )
                )
            }
        }
    }

    private fun android.database.Cursor.toItem() = Item(
        sku = getString(0), name = getString(1), price = getDouble(2),
        quantity = getInt(3), shelfId = getString(4),
        aisleNumber = getString(5), imageUrl = getString(6)
    )

    private fun escapeLike(q: String) = q.trim().lowercase()
        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

    fun searchCount(query: String): Int {
        val q = escapeLike(query)
        return readableDatabase.rawQuery(
            "SELECT COUNT(*) FROM items WHERE name_lower LIKE ? ESCAPE '\\' OR sku LIKE ? ESCAPE '\\'",
            arrayOf("%$q%", "%$q%")
        ).use { it.moveToFirst(); it.getInt(0) }
    }

    fun search(query: String, limit: Int, offset: Int): List<Item> {
        val q = escapeLike(query)
        val sql = """
        SELECT sku, name, price, quantity, shelf_id, aisle_number, image_url
        FROM items
        WHERE name_lower LIKE ? ESCAPE '\' OR sku LIKE ? ESCAPE '\'
        ORDER BY CASE WHEN name_lower LIKE ? ESCAPE '\' THEN 0 ELSE 1 END, name_lower, sku
        LIMIT ? OFFSET ?"""
        return readableDatabase.rawQuery(
            sql, arrayOf("%$q%", "%$q%", "$q%", limit.toString(), offset.toString())
        ).use { c -> buildList { while (c.moveToNext()) add(c.toItem()) } }
    }
}