package com.viecz.vieczandroid.data.local.database

import org.junit.Test
import kotlin.test.assertEquals

class AppDatabaseTest {

    @Test
    fun `DATABASE_NAME is correct`() {
        assertEquals("viecz_database", AppDatabase.DATABASE_NAME)
    }
}
