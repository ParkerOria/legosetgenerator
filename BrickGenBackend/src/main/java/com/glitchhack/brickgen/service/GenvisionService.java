package com.glitchhack.brickgen.service;

import com.glitchhack.brickgen.dto.analyzeSet.GenerateStepsResponse;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GenvisionService {

    private static final Pattern SET_NUMBER_PATTERN = Pattern.compile("\\b\\d{4,6}\\b");

    private static final String PROMPT_ANALYZE_SET =
            "This is a LEGO set box. Extract the set number only — it is the " +
                    "4 to 6 digit number printed on the box (usually found in a corner " +
                    "or near the barcode). Return ONLY the number, nothing else. " +
                    "If no set number is visible, return the word: unknown";

    private static final String PROMPT_GENERATE_IDEAS = """
                Use Gemini to generate a single LEGO build idea from the parts and user prompt.
                
                """;

    private final ChatClient chatClient;

    public GenvisionService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    public int analyzeSet(MultipartFile file) throws IOException {
        byte[] imageBytes = file.getBytes();
        MimeType mimeType = MimeTypeUtils.parseMimeType(
                Optional.ofNullable(file.getContentType()).orElse("image/jpeg")
        );

        String raw = Optional.ofNullable(
                chatClient.prompt()
                        .user(u -> u
                                .text(PROMPT_ANALYZE_SET)
                                .media(mimeType, new ByteArrayResource(imageBytes)))
                        .call()
                        .content()
        ).orElse("").trim();

        if ("unknown".equalsIgnoreCase(raw)) {
            return -1;
        }

        Matcher matcher = SET_NUMBER_PATTERN.matcher(raw);
        return matcher.find() ? Integer.parseInt(matcher.group()) : -1;
    }


    public GenerateStepsResponse generateSteps() {
        return null;
    }
}
