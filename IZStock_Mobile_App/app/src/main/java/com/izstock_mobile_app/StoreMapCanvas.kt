package com.izstock_mobile_app

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
import androidx.compose.ui.unit.sp


private fun List<List<Float>>.toPath() = Path().apply {
    forEachIndexed { i, p -> if (i == 0) moveTo(p[0], p[1]) else lineTo(p[0], p[1]) }
    close()
}

private fun List<List<Float>>.boundsBox(): FloatArray = floatArrayOf(
    minOf { it[0] }, minOf { it[1] }, maxOf { it[0] }, maxOf { it[1] }
)

private fun parseColor(hex: String?, fallback: Color): Color =
    hex?.let { runCatching { Color(it.toColorInt()) }.getOrNull() } ?: fallback

@Composable
fun StoreMapCanvas(map: StoreMap, modifier: Modifier = Modifier) {
    var canvasSize by remember { mutableStateOf(IntSize.Zero) }
    var userScale by remember { mutableFloatStateOf(1f) }
    var userOffset by remember { mutableStateOf(Offset.Zero) }

    val textMeasurer = rememberTextMeasurer()
    val labelColor = MaterialTheme.colorScheme.onSurface
    val labelBg = MaterialTheme.colorScheme.surface.copy(alpha = 0.75f)

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

    Canvas(
        modifier = modifier
            .fillMaxSize()
            .onSizeChanged { canvasSize = it }
            .pointerInput(Unit) {
                detectTransformGestures { centroid, pan, zoom, _ ->
                    val newScale = (userScale * zoom).coerceIn(0.5f, 8f)
                    val z = newScale / userScale
                    // Zoom around the fingers, then apply pan
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
                        drawPath(shelf.polygon.toPath(), Color(0xFF6D4C41).copy(alpha = 0.6f))
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
    }
}