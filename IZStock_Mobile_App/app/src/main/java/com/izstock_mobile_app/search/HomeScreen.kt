package com.izstock_mobile_app.search

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.izstock_mobile_app.R
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.izstock_mobile_app.data.Item
import com.izstock_mobile_app.data.SearchState
import com.izstock_mobile_app.data.SearchViewModel

// Stateful
@Composable
fun HomeScreen(
    modifier: Modifier = Modifier,
    viewModel: SearchViewModel = viewModel(),
    onItemClick: (Item) -> Unit = {}   // week 7: navigate to detail / highlight on map
) {
    val query = viewModel.query.collectAsStateWithLifecycle().value
    val state = viewModel.state.collectAsStateWithLifecycle().value
    val suggestions = viewModel.suggestions.collectAsStateWithLifecycle().value

    HomeContent(
        query = query,
        state = state,
        suggestions = suggestions,
        onQueryChange = viewModel::onQueryChange,
        onSubmit = viewModel::onSubmit,
        onSuggestionClick = viewModel::onSuggestionClick,
        onClear = viewModel::clear,
        onItemClick = onItemClick,
        modifier = modifier,
        onLoadMore = viewModel::loadMore,
    )
}

// Stateless
@Composable
fun HomeContent(
    query: String,
    state: SearchState,
    suggestions: List<Item>,
    onQueryChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onSuggestionClick: (String) -> Unit,
    onClear: () -> Unit,
    onItemClick: (Item) -> Unit,
    modifier: Modifier = Modifier,
    onLoadMore: () -> Unit
) {
    val focusManager = LocalFocusManager.current

    Column(modifier.fillMaxSize().padding(16.dp)) {
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search for an item") },
            leadingIcon = { Icon(painterResource(R.drawable.ic_search), contentDescription = null) },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(onClick = onClear) {
                        Icon(painterResource(R.drawable.ic_close), contentDescription = "Clear search")
                    }
                }
            },
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = {
                focusManager.clearFocus()
                onSubmit()
            })
        )

        Spacer(Modifier.height(12.dp))

        when (state) {
            is SearchState.Idle -> {
                if (query.isBlank()) {
                    CenteredMessage("Search for an item by it's name")
                } else {
                    LazyColumn {
                        items(suggestions, key = { it.name }) { item ->
                            SuggestionRow(item.name) {
                                focusManager.clearFocus()
                                onSuggestionClick(item.name)
                            }
                        }
                    }
                }
            }
            is SearchState.Loading -> Box(Modifier.fillMaxSize(), Alignment.Center) {
                CircularProgressIndicator()
            }
            is SearchState.Error -> {
                if (state.message.contains("404")) {
                    CenteredMessage("Unable to connect to server.")
                } else {
                    CenteredMessage("An unknown error occurred.")
                }
            }
            is SearchState.Success -> {
                if (state.items.isEmpty()) {
                    CenteredMessage("No items found for \"${query.trim()}\"")
                } else {
                    ResultsList(state, onItemClick, onLoadMore)
                }
            }
        }
    }
}

@Composable
fun ResultsList(state: SearchState.Success, onItemClick: (Item) -> Unit, onLoadMore: () -> Unit) {
    val listState = rememberLazyListState()

    val nearEnd by remember {
        derivedStateOf {
            val info = listState.layoutInfo
            val last = info.visibleItemsInfo.lastOrNull()?.index ?: 0
            last >= info.totalItemsCount - 4
        }
    }

    LaunchedEffect(nearEnd, state.items.size) {
        if (nearEnd && !state.loadingMoreFailed) onLoadMore()
    }

    LazyColumn(state = listState, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            Text(
                "${state.total} result${if (state.total == 1) "" else "s"}",
                style = MaterialTheme.typography.labelLarge
            )
        }
        items(state.items, key = { it.sku }) { item ->
            ItemRow(item, onClick = { onItemClick(item) })
        }
        if (state.isLoadingMore) {
            item {
                Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
        }
        if (state.loadingMoreFailed) {
            item {
                Box(Modifier.fillMaxWidth().padding(8.dp), Alignment.Center) {
                    TextButton(onClick = onLoadMore) { Text("Couldn't load more. Tap to retry") }
                }
            }
        }
    }

}

@Composable
private fun SuggestionRow(name: String, onClick: () -> Unit) {
    Text(
        text = name,
        style = MaterialTheme.typography.bodyLarge,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 4.dp)
    )
}

@Composable
private fun ItemRow(item: Item, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(item.name, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(4.dp))
            val location = item.aisleNumber?.let { "Aisle $it" } ?: "Location unknown"
            Text(
                "$location  ·  $${"%.2f".format(item.price)}",
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                if (item.quantity > 0) "${item.quantity} in stock" else "Out of stock",
                style = MaterialTheme.typography.bodySmall,
                color = if (item.quantity > 0) MaterialTheme.colorScheme.onSurfaceVariant
                else MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
private fun CenteredMessage(text: String) {
    Box(Modifier.fillMaxSize(), Alignment.Center) {
        Text(text, style = MaterialTheme.typography.bodyLarge)
    }
}