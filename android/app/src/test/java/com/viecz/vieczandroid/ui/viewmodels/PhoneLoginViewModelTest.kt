package com.viecz.vieczandroid.ui.viewmodels

import app.cash.turbine.test
import com.viecz.vieczandroid.auth.PhoneAuthManager
import com.viecz.vieczandroid.data.repository.AuthRepository
import com.viecz.vieczandroid.testutil.CoroutineTestRule
import com.viecz.vieczandroid.testutil.TestData
import io.mockk.*
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

@OptIn(ExperimentalCoroutinesApi::class)
class PhoneLoginViewModelTest {

    @get:Rule
    val coroutineRule = CoroutineTestRule()

    private lateinit var mockPhoneAuthManager: PhoneAuthManager
    private lateinit var mockRepository: AuthRepository
    private lateinit var viewModel: PhoneLoginViewModel

    private val testUser = TestData.createUser()

    @Before
    fun setup() {
        mockPhoneAuthManager = mockk(relaxed = true)
        mockRepository = mockk()
        viewModel = PhoneLoginViewModel(mockPhoneAuthManager, mockRepository)
    }

    @After
    fun tearDown() {
        clearAllMocks()
    }

    @Test
    fun `initial state should be Idle`() = runTest {
        viewModel.state.test {
            assertIs<PhoneAuthState.Idle>(awaitItem())
        }
    }

    @Test
    fun `sendCode with invalid phone should emit Error at PHONE_INPUT step`() = runTest {
        val activity = mockk<android.app.Activity>()

        viewModel.sendCode("invalid", activity)
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertIs<PhoneAuthState.Error>(state)
            assertEquals(PhoneAuthStep.PHONE_INPUT, state.step)
        }
    }

    @Test
    fun `sendCode success should emit CodeSent`() = runTest {
        val activity = mockk<android.app.Activity>()
        coEvery { mockPhoneAuthManager.sendVerificationCode(any(), any()) } returns Result.success(Unit)
        every { mockPhoneAuthManager.hasAutoCredential() } returns false

        viewModel.sendCode("0371234567", activity)
        advanceUntilIdle()

        viewModel.state.test {
            assertIs<PhoneAuthState.CodeSent>(awaitItem())
        }

        coVerify { mockPhoneAuthManager.sendVerificationCode("+84371234567", activity) }
    }

    @Test
    fun `sendCode normalizes Vietnamese phone number to E164`() = runTest {
        val activity = mockk<android.app.Activity>()
        coEvery { mockPhoneAuthManager.sendVerificationCode(any(), any()) } returns Result.success(Unit)
        every { mockPhoneAuthManager.hasAutoCredential() } returns false

        viewModel.sendCode("0371234567", activity)
        advanceUntilIdle()

        assertEquals("+84371234567", viewModel.getNormalizedPhone())
    }

    @Test
    fun `sendCode failure should emit Error at PHONE_INPUT step`() = runTest {
        val activity = mockk<android.app.Activity>()
        coEvery { mockPhoneAuthManager.sendVerificationCode(any(), any()) } returns Result.failure(Exception("Firebase error"))

        viewModel.sendCode("0371234567", activity)
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertIs<PhoneAuthState.Error>(state)
            assertEquals("Firebase error", state.message)
            assertEquals(PhoneAuthStep.PHONE_INPUT, state.step)
        }
    }

    @Test
    fun `verifyCode success should emit Success with user`() = runTest {
        coEvery { mockPhoneAuthManager.verifyCode(any()) } returns Result.success("firebase-id-token")
        coEvery { mockRepository.loginWithPhone(any()) } returns Result.success(testUser)

        viewModel.verifyCode("123456")
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertIs<PhoneAuthState.Success>(state)
            assertEquals(testUser, state.user)
        }

        coVerify { mockPhoneAuthManager.verifyCode("123456") }
        coVerify { mockRepository.loginWithPhone("firebase-id-token") }
    }

    @Test
    fun `verifyCode with bad OTP should emit Error at CODE_INPUT step`() = runTest {
        coEvery { mockPhoneAuthManager.verifyCode(any()) } returns Result.failure(Exception("Invalid code"))

        viewModel.verifyCode("000000")
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertIs<PhoneAuthState.Error>(state)
            assertEquals("Invalid code", state.message)
            assertEquals(PhoneAuthStep.CODE_INPUT, state.step)
        }
    }

    @Test
    fun `verifyCode with backend failure should emit Error at CODE_INPUT step`() = runTest {
        coEvery { mockPhoneAuthManager.verifyCode(any()) } returns Result.success("firebase-id-token")
        coEvery { mockRepository.loginWithPhone(any()) } returns Result.failure(Exception("Server error"))

        viewModel.verifyCode("123456")
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertIs<PhoneAuthState.Error>(state)
            assertEquals("Server error", state.message)
            assertEquals(PhoneAuthStep.CODE_INPUT, state.step)
        }
    }

    @Test
    fun `resetState should return to Idle`() = runTest {
        // First get to a non-idle state
        coEvery { mockPhoneAuthManager.verifyCode(any()) } returns Result.failure(Exception("err"))
        viewModel.verifyCode("000000")
        advanceUntilIdle()

        viewModel.resetState()

        viewModel.state.test {
            assertIs<PhoneAuthState.Idle>(awaitItem())
        }
    }

    @Test
    fun `auto-verification should exchange token with backend directly`() = runTest {
        val activity = mockk<android.app.Activity>()
        coEvery { mockPhoneAuthManager.sendVerificationCode(any(), any()) } returns Result.success(Unit)
        every { mockPhoneAuthManager.hasAutoCredential() } returns true
        coEvery { mockPhoneAuthManager.verifyCode(any()) } returns Result.success("auto-token")
        coEvery { mockRepository.loginWithPhone(any()) } returns Result.success(testUser)

        viewModel.sendCode("0371234567", activity)
        advanceUntilIdle()

        viewModel.state.test {
            val state = awaitItem()
            assertIs<PhoneAuthState.Success>(state)
            assertEquals(testUser, state.user)
        }
    }

    @Test
    fun `resendCode should call phoneAuthManager resendCode`() = runTest {
        val activity = mockk<android.app.Activity>()
        // First send code to set normalizedPhone
        coEvery { mockPhoneAuthManager.sendVerificationCode(any(), any()) } returns Result.success(Unit)
        every { mockPhoneAuthManager.hasAutoCredential() } returns false
        viewModel.sendCode("0371234567", activity)
        advanceUntilIdle()

        coEvery { mockPhoneAuthManager.resendCode(any(), any()) } returns Result.success(Unit)

        viewModel.resendCode(activity)
        advanceUntilIdle()

        viewModel.state.test {
            assertIs<PhoneAuthState.CodeSent>(awaitItem())
        }

        coVerify { mockPhoneAuthManager.resendCode("+84371234567", activity) }
    }
}
