package com.viecz.vieczandroid.data.local.database

import com.viecz.vieczandroid.data.models.TaskStatus
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ConvertersTest {

    private lateinit var converters: Converters

    @Before
    fun setup() {
        converters = Converters()
    }

    // --- fromTaskStatus tests ---

    @Test
    fun `fromTaskStatus converts OPEN to string`() {
        assertEquals("OPEN", converters.fromTaskStatus(TaskStatus.OPEN))
    }

    @Test
    fun `fromTaskStatus converts IN_PROGRESS to string`() {
        assertEquals("IN_PROGRESS", converters.fromTaskStatus(TaskStatus.IN_PROGRESS))
    }

    @Test
    fun `fromTaskStatus converts COMPLETED to string`() {
        assertEquals("COMPLETED", converters.fromTaskStatus(TaskStatus.COMPLETED))
    }

    @Test
    fun `fromTaskStatus converts CANCELLED to string`() {
        assertEquals("CANCELLED", converters.fromTaskStatus(TaskStatus.CANCELLED))
    }

    // --- toTaskStatus tests ---

    @Test
    fun `toTaskStatus converts OPEN string to enum`() {
        assertEquals(TaskStatus.OPEN, converters.toTaskStatus("OPEN"))
    }

    @Test
    fun `toTaskStatus converts IN_PROGRESS string to enum`() {
        assertEquals(TaskStatus.IN_PROGRESS, converters.toTaskStatus("IN_PROGRESS"))
    }

    @Test
    fun `toTaskStatus converts COMPLETED string to enum`() {
        assertEquals(TaskStatus.COMPLETED, converters.toTaskStatus("COMPLETED"))
    }

    @Test
    fun `toTaskStatus converts CANCELLED string to enum`() {
        assertEquals(TaskStatus.CANCELLED, converters.toTaskStatus("CANCELLED"))
    }

    @Test
    fun `toTaskStatus throws for invalid string`() {
        assertFailsWith<IllegalArgumentException> {
            converters.toTaskStatus("INVALID")
        }
    }

    // --- Round-trip tests ---

    @Test
    fun `round trip preserves OPEN status`() {
        val original = TaskStatus.OPEN
        assertEquals(original, converters.toTaskStatus(converters.fromTaskStatus(original)))
    }

    @Test
    fun `round trip preserves IN_PROGRESS status`() {
        val original = TaskStatus.IN_PROGRESS
        assertEquals(original, converters.toTaskStatus(converters.fromTaskStatus(original)))
    }

    @Test
    fun `round trip preserves COMPLETED status`() {
        val original = TaskStatus.COMPLETED
        assertEquals(original, converters.toTaskStatus(converters.fromTaskStatus(original)))
    }

    @Test
    fun `round trip preserves CANCELLED status`() {
        val original = TaskStatus.CANCELLED
        assertEquals(original, converters.toTaskStatus(converters.fromTaskStatus(original)))
    }

    @Test
    fun `all TaskStatus values can be converted`() {
        for (status in TaskStatus.values()) {
            val str = converters.fromTaskStatus(status)
            val back = converters.toTaskStatus(str)
            assertEquals(status, back, "Round trip failed for $status")
        }
    }
}
