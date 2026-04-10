package com.glitchhack.brickgen.dto.generateBuild;

public record GenerateBuildFinalResponse(
    GenerateBuildResponse buildResponse,
    GenerateBuildImageResponse imageResponse,
    RebrickablePartsSummary partsSummary
    

) {
}
