package com.izstock_mobile_app.list

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.izstock_mobile_app.R
import com.izstock_mobile_app.data.Item
import com.izstock_mobile_app.data.ListEntry

@Composable
fun ListScreen(
    viewModel: ListViewModel,
    isSignedIn: Boolean,
    onLogin: () -> Unit,
    onItemClick: (Item) -> Unit,
    modifier: Modifier = Modifier
) {
    val entries by viewModel.entries.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { viewModel.refresh() }   // live price and stock on every visit

    ListContent(
        entries = entries,
        isSignedIn = isSignedIn,
        onLogin = onLogin,
        onToggle = viewModel::toggleChecked,
        onIncrement = viewModel::increment,
        onDecrement = viewModel::decrement,
        onRemove = viewModel::remove,
        onClearChecked = viewModel::clearChecked,
        onItemClick = onItemClick,
        modifier = modifier
    )
}

@Composable
private fun ListRow(
    entry: ListEntry,
    onToggle: () -> Unit,
    onIncrement: () -> Unit,
    onDecrement: () -> Unit,
    onRemove: () -> Unit,
    onClick: () -> Unit
) {
    val item = entry.item
    val outOfStock = item.quantity <= 0

    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Checkbox(checked = entry.checked, onCheckedChange = { onToggle() })

        Card(onClick = onClick, modifier = Modifier.weight(1f)) {
            Row(Modifier.padding(start = 16.dp, top = 12.dp, bottom = 8.dp, end = 4.dp)) {
                Column(Modifier.weight(1f)) {
                    Text(
                        item.name,
                        style = MaterialTheme.typography.titleMedium,
                        textDecoration = if (entry.checked) TextDecoration.LineThrough else null,
                        color = if (entry.checked) MaterialTheme.colorScheme.onSurfaceVariant
                        else MaterialTheme.colorScheme.onSurface
                    )
                    val aisle = item.aisleNumber?.let { "Aisle $it" } ?: "Location unknown"
                    when {
                        entry.gone -> Text(
                            "No longer available",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                        outOfStock -> Text(
                            "$aisle  ·  Out of stock (not in total)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error
                        )
                        else -> {
                            val each = "$${"%.2f".format(item.price)}"
                            val line = if (entry.quantity > 1)
                                "$each each  ·  $${"%.2f".format(item.price * entry.quantity)}"
                            else each
                            Text("$aisle  ·  $line", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                    if (!entry.gone) {
                        AddToListControl(entry.quantity, onAdd = onIncrement, onDecrease = onDecrement)
                    }
                }
                IconButton(onClick = onRemove) {
                    Icon(painterResource(R.drawable.ic_delete), contentDescription = "Remove ${item.name}")
                }
            }
        }
    }
}
@Composable
fun ListContent(
    entries: List<ListEntry>,
    isSignedIn: Boolean,
    onLogin: () -> Unit,
    onToggle: (String) -> Unit,
    onIncrement: (String) -> Unit,
    onDecrement: (String) -> Unit,
    onRemove: (String) -> Unit,
    onClearChecked: () -> Unit,
    onItemClick: (Item) -> Unit,
    modifier: Modifier
) {
    // out-of-stock and deleted items stay in the list but not in the total
    val counted = entries.filter { !it.gone && it.item.quantity > 0 }
    val total = counted.sumOf { it.item.price * it.quantity }
    val excluded = entries.size - counted.size

    Column(modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("My list", style = MaterialTheme.typography.headlineSmall)
                    if (entries.any { it.checked }) {
                        TextButton(onClick = onClearChecked) { Text("Clear checked") }
                    }
                }
            }
            if (!isSignedIn) {
                item {
                    Card(Modifier.fillMaxWidth()) {
                        Row(
                            Modifier.padding(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "Sign in to keep this list on all your devices.",
                                Modifier.weight(1f),
                                style = MaterialTheme.typography.bodyMedium
                            )
                            TextButton(onClick = onLogin) { Text("Log in") }
                        }
                    }
                }
            }
            if (entries.isEmpty()) {
                item {
                    Box(Modifier
                        .fillMaxWidth()
                        .padding(top = 48.dp), Alignment.Center) {
                        Text("Your list is empty. Search for an item and tap Add.")
                    }
                }
            }
            this.items(
                items = entries,
                key = { it.sku }
            ) {entry ->
                ListRow(
                    entry,
                    onToggle = { onToggle(entry.sku) },
                    onIncrement = { onIncrement(entry.sku) },
                    onDecrement = { onDecrement(entry.sku) },
                    onRemove = { onRemove(entry.sku) },
                    onClick = { onItemClick(entry.item) }
                )
            }
        }

        if (entries.isNotEmpty()) {
            Surface(tonalElevation = 3.dp, shadowElevation = 4.dp) {
                Column(Modifier
                    .fillMaxWidth()
                    .padding(16.dp)) {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Total (${counted.sumOf { it.quantity }} items)",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            "$${"%.2f".format(total)}",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    if (excluded > 0) {
                        Text(
                            "$excluded ${if (excluded == 1) "item isn't" else "items aren't"} included (out of stock or unavailable)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}