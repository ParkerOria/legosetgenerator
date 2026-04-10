package com.glitchhack.brickgen.dto.generateBuild;

public record GenerateBuildImageRequest(
        GenerateBuildResponse ideasAndDescriptions,
        RebrickablePartsSummary partsSummary
) {
}
