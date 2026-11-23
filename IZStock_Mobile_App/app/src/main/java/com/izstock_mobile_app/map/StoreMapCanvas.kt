package com.izstock_mobile_app.map

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.IntSize
import kotlin.math.min
import androidx.core.graphics.toColorInt
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.izstock_mobile_app.data.Aisle
import com.izstock_mobile_app.data.Shelf
import com.izstock_mobile_app.data.StoreMap


private fun List<List<Float>>.toPath() = Path().apply {
    forEachIndexed { i, p -> if (i == 0) moveTo(p[0], p[1]) else lineTo(p[0], p[1]) }
    close()
}

private fun List<List<Float>>.boundsBox(): FloatArray = floatArrayOf(
    minOf { it[0] }, minOf { it[1] }, maxOf { it[0] }, maxOf { it[1] }
)

private fun parseColor(hex: String?, fallback: Color): Color =
    hex?.let { runCatching { Color(it.toColorInt()) }.getOrNull() } ?: fallback

fun StoreMap.findShelf(shelfId:String): Pair<Aisle, Shelf>?{
    sections.forEach { s ->
        s.aisles.forEach { a ->
            a.shelves.firstOrNull { it.id == shelfId }?.let {return a to it}
        }
    }
    return null
}

@Composable
fun StoreMapCanvas(map: StoreMap, pin: MapPin ?= null, modifier: Modifier = Modifier) {
    var canvasSize by remember { mutableStateOf(IntSize.Zero) }
    var userScale by remember { mutableFloatStateOf(1f) }
    var userOffset by remember { mutableStateOf(Offset.Zero) }

    val textMeasurer = rememberTextMeasurer()
    val labelColor = MaterialTheme.colorScheme.onSurface
    val labelBg = MaterialTheme.colorScheme.surface.copy(alpha = 0.75f)

    val pinColor = MaterialTheme.colorScheme.error
    val pinShelfId = pin?.shelfId
    val pinTarget = remember(map, pinShelfId) {
        pinShelfId
            ?.let { map.findShelf(it)?.second?.polygon?.boundsBox() }
            ?.let { b -> Offset((b[0] + b[2]) / 2f, (b[1] + b[3]) / 2f) }
    }

    // bounding box of every section point, computed once per map
    val bounds = remember(map) {
        val pts = map.sections.flatMap { it.polygon }
        floatArrayOf(
            pts.minOf { it[0] }, pts.minOf { it[1] },
            pts.maxOf { it[0] }, pts.maxOf { it[1] }
        )
    }

    // Fit-to-screen: world coordinates -> screen at userScale = 1
    val padding = 0.9f
    val worldW = bounds[2] - bounds[0]
    val worldH = bounds[3] - bounds[1]
    val baseScale = if (canvasSize == IntSize.Zero) 1f else
        min(canvasSize.width / worldW, canvasSize.height / worldH) * padding
    val baseOffset = Offset(
        (canvasSize.width - worldW * baseScale) / 2f - bounds[0] * baseScale,
        (canvasSize.height - worldH * baseScale) / 2f - bounds[1] * baseScale
    )

    LaunchedEffect(pinTarget, canvasSize) {
        val t = pinTarget ?: return@LaunchedEffect
        if (canvasSize == IntSize.Zero) return@LaunchedEffect
        val zoom = 3f
        // Solve toScreen(t) == canvas center for userOffset
        userScale = zoom
        userOffset = Offset(canvasSize.width / 2f, canvasSize.height / 2f) -
                Offset(t.x * baseScale + baseOffset.x, t.y * baseScale + baseOffset.y) * zoom
    }

    Canvas(
        modifier = modifier
            .fillMaxSize()
            .onSizeChanged { canvasSize = it }
            .pointerInput(Unit) {
                detectTransformGestures { centroid, pan, zoom, _ ->
                    val newScale = (userScale * zoom).coerceIn(0.5f, 8f)
                    val z = newScale / userScale
                    userOffset = (userOffset - centroid) * z + centroid + pan
                    userScale = newScale
                }
            }
    ) {
        // ---- Shapes (world space, scaled) ----
        withTransform({
            translate(userOffset.x, userOffset.y)
            scale(userScale, userScale, pivot = Offset.Zero)
            translate(baseOffset.x, baseOffset.y)
            scale(baseScale, baseScale, pivot = Offset.Zero)
        }) {
            val line = 2f / (baseScale * userScale)  // keep outlines ~2px at any zoom
            map.sections.forEach { section ->
                val sectionColor = parseColor(section.color, Color.LightGray)
                drawPath(section.polygon.toPath(), sectionColor.copy(alpha = 0.35f))
                drawPath(section.polygon.toPath(), sectionColor, style = Stroke(line))
                section.aisles.forEach { aisle ->
                    drawPath(aisle.polygon.toPath(), Color.DarkGray, style = Stroke(line))
                    aisle.shelves.forEach { shelf ->
                        val color = if(shelf.id == pinShelfId) {
                            pinColor.copy(alpha=.85f)
                        } else {
                            Color(0xFF6D4C41).copy(alpha = 0.6f)
                        }
                        drawPath(shelf.polygon.toPath(), color)
                    }
                }
            }
        }

        val totalScale = baseScale * userScale
        fun toScreen(x: Float, y: Float) =
            Offset(x * baseScale + baseOffset.x, y * baseScale + baseOffset.y) * userScale + userOffset

        val sectionStyle = TextStyle(
            fontSize = 14.sp, fontWeight = FontWeight.Bold,
            color = labelColor, background = labelBg
        )
        val aisleStyle = TextStyle(fontSize = 12.sp, color = labelColor, background = labelBg)

        map.sections.forEach { section ->
            val sb = section.polygon.boundsBox()
            val sLayout = textMeasurer.measure(section.name, sectionStyle)
            val sPos = toScreen(sb[0], sb[1])
            drawText(sLayout, topLeft = Offset(sPos.x, sPos.y - sLayout.size.height - 2f))

            section.aisles.forEach { aisle ->
                val ab = aisle.polygon.boundsBox()
                val screenWidth = (ab[2] - ab[0]) * totalScale
                if (screenWidth > 28f) {  // restore the threshold now that it works
                    val layout = textMeasurer.measure(aisle.aisleNumber, aisleStyle)
                    val center = toScreen((ab[0] + ab[2]) / 2f, (ab[1] + ab[3]) / 2f)
                    drawText(
                        layout,
                        topLeft = center - Offset(layout.size.width / 2f, layout.size.height / 2f)
                    )
                }
            }
        }

        pinTarget?.let { t ->
            val tip = toScreen(t.x, t.y)
            val r = 11.dp.toPx()
            val head = Offset(tip.x, tip.y - 30.dp.toPx())
            val point = Path().apply {
                moveTo(tip.x, tip.y)
                lineTo(head.x - r * 0.85f, head.y + r * 0.5f)
                lineTo(head.x + r * 0.85f, head.y + r * 0.5f)
                close()
            }
            drawPath(point, pinColor)
            drawCircle(pinColor, r, head)
            drawCircle(Color.White, r * 0.4f, head)
        }
    }
}