package com.glitchhack.brickgen.dto.generateBuild;

import org.springframework.web.multipart.MultipartFile;

public record GenerateBuildImageResponse(
        MultipartFile imageFile
) {
}
