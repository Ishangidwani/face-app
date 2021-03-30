import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as faceapi from 'face-api.js';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild("video")
  video!: ElementRef;
  ngAfterViewInit(){
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/assets/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/assets/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/assets/models')
    ]).then(this.startVideo.bind(this));

  }
  ngOnInit(){
  }
  
  startVideo() {
    console.log(this)
    navigator.getUserMedia(
      { video: {} },
      stream => this.video.nativeElement.srcObject = stream,
      err => console.error(err)
    )
  }
  
  play(){
    const canvas: any = faceapi.createCanvasFromMedia(this.video.nativeElement)
    document.body.append(canvas)
    const displaySize = { width: this.video.nativeElement.width, height: this.video.nativeElement.height }
    faceapi.matchDimensions(canvas, displaySize)
    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(this.video.nativeElement, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions()
      const resizedDetections = faceapi.resizeResults(detections, displaySize)
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      faceapi.draw.drawDetections(canvas, resizedDetections)
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections)
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections)
    }, 100)
  }
  
}
