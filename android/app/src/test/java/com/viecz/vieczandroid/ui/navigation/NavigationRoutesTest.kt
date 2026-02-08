package com.viecz.vieczandroid.ui.navigation

import org.junit.Test
import kotlin.test.assertEquals

class NavigationRoutesTest {

    // --- NavigationRoutes constant tests ---

    @Test
    fun `SPLASH route is correct`() {
        assertEquals("splash", NavigationRoutes.SPLASH)
    }

    @Test
    fun `LOGIN route is correct`() {
        assertEquals("login", NavigationRoutes.LOGIN)
    }

    @Test
    fun `REGISTER route is correct`() {
        assertEquals("register", NavigationRoutes.REGISTER)
    }

    @Test
    fun `HOME route is correct`() {
        assertEquals("home", NavigationRoutes.HOME)
    }

    @Test
    fun `TASK_DETAIL route template is correct`() {
        assertEquals("task_detail/{taskId}", NavigationRoutes.TASK_DETAIL)
    }

    @Test
    fun `CREATE_TASK route is correct`() {
        assertEquals("create_task", NavigationRoutes.CREATE_TASK)
    }

    @Test
    fun `APPLY_TASK route template is correct`() {
        assertEquals("apply_task/{taskId}/{price}", NavigationRoutes.APPLY_TASK)
    }

    @Test
    fun `PROFILE route is correct`() {
        assertEquals("profile", NavigationRoutes.PROFILE)
    }

    @Test
    fun `WALLET route is correct`() {
        assertEquals("wallet", NavigationRoutes.WALLET)
    }

    @Test
    fun `CHAT route template is correct`() {
        assertEquals("chat/{conversationId}", NavigationRoutes.CHAT)
    }

    @Test
    fun `FIRST_SCREEN route is correct`() {
        assertEquals("first_screen", NavigationRoutes.FIRST_SCREEN)
    }

    @Test
    fun `SECOND_SCREEN route is correct`() {
        assertEquals("second_screen", NavigationRoutes.SECOND_SCREEN)
    }

    @Test
    fun `PAYMENT_SCREEN route is correct`() {
        assertEquals("payment_screen", NavigationRoutes.PAYMENT_SCREEN)
    }

    // --- Helper function tests ---

    @Test
    fun `taskDetail builds correct route with taskId`() {
        assertEquals("task_detail/42", NavigationRoutes.taskDetail(42))
    }

    @Test
    fun `taskDetail with zero taskId`() {
        assertEquals("task_detail/0", NavigationRoutes.taskDetail(0))
    }

    @Test
    fun `applyTask builds correct route with taskId and price`() {
        assertEquals("apply_task/5/100000", NavigationRoutes.applyTask(5, 100000))
    }

    @Test
    fun `applyTask with zero price`() {
        assertEquals("apply_task/10/0", NavigationRoutes.applyTask(10, 0))
    }

    @Test
    fun `chat builds correct route with conversationId`() {
        assertEquals("chat/7", NavigationRoutes.chat(7))
    }

    @Test
    fun `chat with large conversationId`() {
        assertEquals("chat/999999", NavigationRoutes.chat(999999))
    }

}
