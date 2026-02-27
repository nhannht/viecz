package com.viecz.vieczandroid.ui.components.metro

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.viecz.vieczandroid.R
import com.viecz.vieczandroid.ui.theme.MetroTheme

/**
 * Data class representing a profile completion gate request.
 * Created when the server returns a 403 profile_incomplete error.
 */
data class ProfileGateRequest(
    val missingFields: List<String>,
    val action: String,
    val message: String,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileCompletionBottomSheet(
    request: ProfileGateRequest,
    saving: Boolean,
    onSubmit: (name: String?, bio: String?) -> Unit,
    onDismiss: () -> Unit,
    onGoToProfile: (() -> Unit)? = null,
) {
    val colors = MetroTheme.colors
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    var name by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    var submitted by remember { mutableStateOf(false) }

    val needsName = request.missingFields.contains("name")
    val needsBio = request.missingFields.contains("bio")

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = colors.card,
        contentColor = colors.fg,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 32.dp),
        ) {
            // Heading
            Text(
                text = heading(needsName, needsBio),
                style = MaterialTheme.typography.titleSmall.copy(
                    letterSpacing = 1.sp,
                ),
                color = colors.fg,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = contextMessage(request.action, needsBio),
                style = MaterialTheme.typography.bodySmall,
                color = colors.muted,
            )
            Spacer(modifier = Modifier.height(16.dp))

            // Fields
            if (needsName) {
                MetroInput(
                    value = name,
                    onValueChange = { name = it },
                    label = stringResource(R.string.profile_gate_name_label),
                    placeholder = stringResource(R.string.profile_gate_name_placeholder),
                    error = if (submitted && name.isBlank()) stringResource(R.string.profile_gate_name_required) else "",
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (needsBio) {
                MetroTextarea(
                    value = bio,
                    onValueChange = { bio = it },
                    label = stringResource(R.string.profile_gate_bio_label),
                    placeholder = stringResource(R.string.profile_gate_bio_placeholder),
                    minLines = 3,
                    error = if (submitted && bio.isBlank()) stringResource(R.string.profile_gate_bio_required) else "",
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // "Go to profile" link on the left
                if (onGoToProfile != null) {
                    TextButton(onClick = {
                        onDismiss()
                        onGoToProfile()
                    }) {
                        Text(
                            text = stringResource(R.string.profile_gate_go_to_profile),
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.muted,
                        )
                    }
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }

                // Buttons on the right
                Row(
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    MetroButton(
                        label = stringResource(R.string.profile_gate_not_now),
                        variant = MetroButtonVariant.Secondary,
                        onClick = onDismiss,
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    if (saving) {
                        MetroSpinner()
                    } else {
                        MetroButton(
                            label = buttonLabel(request.action),
                            variant = MetroButtonVariant.Primary,
                            onClick = {
                                submitted = true
                                if (needsName && name.isBlank()) return@MetroButton
                                if (needsBio && bio.isBlank()) return@MetroButton
                                onSubmit(
                                    if (needsName) name.trim() else null,
                                    if (needsBio) bio.trim() else null,
                                )
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun heading(hasName: Boolean, hasBio: Boolean): String {
    return when {
        hasName && hasBio -> stringResource(R.string.profile_gate_heading_both)
        hasName -> stringResource(R.string.profile_gate_heading_name)
        hasBio -> stringResource(R.string.profile_gate_heading_bio)
        else -> stringResource(R.string.profile_gate_heading_both)
    }
}

@Composable
private fun buttonLabel(action: String): String {
    return when (action) {
        "post_task" -> stringResource(R.string.profile_gate_complete_and_post)
        "apply_task" -> stringResource(R.string.profile_gate_complete_and_apply)
        "send_message" -> stringResource(R.string.profile_gate_complete_and_send)
        else -> stringResource(R.string.profile_gate_complete_and_continue)
    }
}

@Composable
private fun contextMessage(action: String, needsBio: Boolean): String {
    return when (action) {
        "post_task" -> stringResource(R.string.profile_gate_message_post_task)
        "apply_task" -> if (needsBio) {
            stringResource(R.string.profile_gate_message_apply_task)
        } else {
            stringResource(R.string.profile_gate_message_apply_task_name)
        }
        "send_message" -> stringResource(R.string.profile_gate_message_send_message)
        else -> stringResource(R.string.profile_gate_message_default)
    }
}
