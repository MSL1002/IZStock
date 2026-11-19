package com.izstock_mobile_app.item

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.izstock_mobile_app.R
import com.izstock_mobile_app.data.Item
import com.izstock_mobile_app.list.AddToListControl

@Composable
fun ItemDetailScreen(
    onBack: () -> Unit,
    onShowOnMap: (Item) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ItemDetailViewModel = viewModel(),
    listQuantities: Map<String, Int>,
    onAddToList: (Item) -> Unit,
    onDecreaseInList: (Item) -> Unit
) {
    val state = viewModel.state.collectAsStateWithLifecycle().value
    ItemDetailContent(state, onBack, viewModel::load, onShowOnMap, modifier, listQuantities, onAddToList, onDecreaseInList)
}

@Composable
fun ItemDetailContent(
    state: ItemDetailState,
    onBack: () -> Unit,
    onRetry: () -> Unit,
    onShowMap: (Item) -> Unit,
    modifier: Modifier = Modifier,
    listQuantities: Map<String, Int>,
    onAddToList: (Item) -> Unit,
    onDecreaseInList: (Item) -> Unit
) {
    Column(modifier.fillMaxSize()){
        Row(modifier.fillMaxWidth().padding(4.dp), verticalAlignment = Alignment.CenterVertically){
            IconButton(onClick = onBack){
                Icon(painterResource(R.drawable.ic_back), contentDescription = "Back")
            }
            Text("Item Details", style = MaterialTheme.typography.titleLarge)
        }

        when (state){
            is ItemDetailState.Loading -> Box(Modifier.fillMaxSize(), Alignment.Center){
                CircularProgressIndicator()
            }
            is ItemDetailState.NotFound -> Box(Modifier.fillMaxSize(), Alignment.Center){
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Item is not available")
                    Button(onClick = onBack) { Text("Back to Search") }
                }
            }
            is ItemDetailState.Error -> Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(state.message)
                Button(onClick = onRetry) { Text("Retry") }
            }
            is ItemDetailState.Success -> ItemDetails(item = state.item, onShowMap, listQuantities, onAddToList, onDecreaseInList)
        }

    }
}

@Composable
fun ItemDetails(
    item: Item,
    onShowOnMap: (Item) -> Unit,
    listQuantities: Map<String, Int>,
    onAddToList: (Item) -> Unit,
    onDecreaseInList: (Item) -> Unit
) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ){
        val placeholder = painterResource(R.drawable.ic_placeholder)
        AsyncImage(
            model = item.imageUrl,
            contentDescription = item.name,
            placeholder = placeholder,
            error = placeholder,
            fallback = placeholder,
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxWidth().height(240.dp)
        )

        Text(item.name, style = MaterialTheme.typography.headlineSmall)
        Text("\$%.2f".format(item.price), style = MaterialTheme.typography.titleLarge)

        StockStatus(item.quantity)

        lateinit var location: String

        if(item.aisleNumber !== null && item.shelfId !== null) {
            "Aisle: ${item.aisleNumber}, Shelf: ${item.shelfId}".also { location = it }
        }

        Card(Modifier.fillMaxWidth()){
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Location", style = MaterialTheme.typography.labelLarge)
                Text(
                    location ?: "Location unknown",
                    style = MaterialTheme.typography.bodyLarge
                )
                Text("SKU: ${item.sku}", style = MaterialTheme.typography.bodySmall)
            }
        }

        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val inList = listQuantities[item.sku] ?: 0
            Text(if (inList > 0) "In your list" else "Add to your list", style = MaterialTheme.typography.titleMedium)
            AddToListControl(inList, { onAddToList(item) }, { onDecreaseInList(item) })
        }

        Button(
            onClick = { onShowOnMap(item) },
            enabled = item.shelfId != null,
            modifier = Modifier.fillMaxWidth()
        ) { Text("Show on map") }

    }
}

private const val LOW_STOCK = 5;

@Composable
private fun StockStatus(quantity: Int) {
    val (text, color) = when {
        quantity <= 0 -> "Out of stock" to MaterialTheme.colorScheme.error
        quantity <= LOW_STOCK -> "Only $quantity left" to MaterialTheme.colorScheme.tertiary
        else -> "In stock ($quantity available)" to MaterialTheme.colorScheme.primary
    }
    Text(text, style = MaterialTheme.typography.titleMedium, color = color)
}
