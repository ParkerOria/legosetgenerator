package com.glitchhack.brickgen.controller;

import com.glitchhack.brickgen.dto.analyzeSet.AnalyzeSetResponse;
import com.glitchhack.brickgen.dto.analyzeSet.GenerateStepsResponse;
import com.glitchhack.brickgen.service.GenvisionService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api-brickgen")
public class GenvisionController {

    private final GenvisionService genvisionService;

    public GenvisionController(GenvisionService genvisionService) {
        this.genvisionService = genvisionService;
    }

    @PostMapping(value = "/analyze-set", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AnalyzeSetResponse> analyzeSet(@RequestPart("file") MultipartFile file) throws Exception {
        int setNumber = genvisionService.analyzeSet(file);

        System.out.println(setNumber + "setNumber?");
        return ResponseEntity.ok(new AnalyzeSetResponse(setNumber));
    }

    @PostMapping(value = "/generate-steps")
    public ResponseEntity<GenerateStepsResponse> generateSteps() {

        GenerateStepsResponse generateStepsResponse = genvisionService.generateSteps();

        return null;
    }



}

//
//    @PostMapping("/generate-build")
//    public ResponseEntity<String> generateBuild(String setNumber, String prompt) {
//        return new ResponseEntity<>(genvisionService.generateBuild(setNumber, prompt), HttpStatus.OK);
//    }
//
//    @PostMapping("/generate-steps")
//    public ResponseEntity<String> generateSteps(String stepsRequest) {
//        return new ResponseEntity<>(genvisionService.generateSteps(stepsRequest), HttpStatus.OK);
//    }
//
//    @PostMapping("/generate-step-image")
//    public ResponseEntity<String> generateStepImage(String stepImageRequest) {
//        return new ResponseEntity<>(genvisionService.generateStepImage(stepImageRequest), HttpStatus.OK);
//    }
