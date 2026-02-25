package com.viecz.vieczandroid.ui.screens

import com.viecz.vieczandroid.testutil.TestData
import org.junit.Test
import kotlin.test.assertEquals

class WalletScreenValidationTest {

    @Test
    fun `buildBankOptions should include only transfer-supported banks with logo and BIN text`() {
        val supportedBank = TestData.createVietQRBank(
            bin = "970436",
            shortName = "Vietcombank",
            logo = "https://api.vietqr.io/img/VCB.png",
            transferSupported = true
        )
        val unsupportedBank = TestData.createVietQRBank(
            id = 2,
            bin = "970418",
            shortName = "BIDV",
            logo = "https://api.vietqr.io/img/BIDV.png",
            transferSupported = false
        )

        val options = buildBankOptions(listOf(supportedBank, unsupportedBank))

        assertEquals(1, options.size)
        assertEquals("970436", options[0].value)
        assertEquals("Vietcombank", options[0].label)
        assertEquals("BIN 970436", options[0].supportingText)
        assertEquals("https://api.vietqr.io/img/VCB.png", options[0].imageUrl)
    }

    @Test
    fun `validateSelectedBankBin should return no error when selected BIN is empty`() {
        val banks = listOf(TestData.createVietQRBank(transferSupported = true))

        val error = validateSelectedBankBin("", banks)

        assertEquals("", error)
    }

    @Test
    fun `validateSelectedBankBin should return no error for valid transfer-supported BIN`() {
        val banks = listOf(TestData.createVietQRBank(bin = "970436", transferSupported = true))

        val error = validateSelectedBankBin("970436", banks)

        assertEquals("", error)
    }

    @Test
    fun `validateSelectedBankBin should return error for invalid or unsupported BIN`() {
        val banks = listOf(
            TestData.createVietQRBank(bin = "970436", transferSupported = true),
            TestData.createVietQRBank(id = 2, bin = "970418", transferSupported = false)
        )

        val invalidError = validateSelectedBankBin("999999", banks)
        val unsupportedError = validateSelectedBankBin("970418", banks)

        assertEquals("Invalid bank BIN selected", invalidError)
        assertEquals("Invalid bank BIN selected", unsupportedError)
    }
}
