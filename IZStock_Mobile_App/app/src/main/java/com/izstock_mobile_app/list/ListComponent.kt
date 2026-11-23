package com.izstock_mobile_app.list

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.izstock_mobile_app.R

@Composable
fun AddToListControl(
    quantity: Int,
    onAdd: () -> Unit,
    onDecrease: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (quantity <= 0) {
        FilledTonalButton(onClick = onAdd, modifier = modifier) {
            Icon(painterResource(R.drawable.ic_add), contentDescription = null, Modifier.size(18.dp))
            Spacer(Modifier.width(4.dp))
            Text("Add")
        }
    } else {
        Row(modifier, verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onDecrease) {
                Icon(painterResource(R.drawable.ic_remove), contentDescription = "Remove one")
            }
            Text(
                "$quantity",
                style = MaterialTheme.typography.titleMedium,
                textAlign = TextAlign.Center,
                modifier = Modifier.widthIn(min = 28.dp)
            )
            IconButton(onClick = onAdd) {
                Icon(painterResource(R.drawable.ic_add), contentDescription = "Add one")
            }
        }
    }
}