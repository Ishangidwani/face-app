import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ThemePalette } from '@angular/material/core';
import { ProgressSpinnerMode } from '@angular/material/progress-spinner';
import * as faceapi from 'face-api.js';
import { ResultItem } from './models/result.item';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild("video")
  video!: ElementRef;
  @ViewChild("canvas")
  canvas!: ElementRef;
  base64Image!: string;
  @ViewChild("imageHolder")
  imageHolder!: ElementRef<HTMLCanvasElement>;
  @ViewChild("cropped")
  cropped!: ElementRef<HTMLCanvasElement>;
  @ViewChild("uploadFile")
  uploadFile!: ElementRef;
  defaultHeight: number = 300;
  defaultWidth: number = 400;
  @ViewChild("imageSrc")
  imageSrc!: ElementRef;
  showWebCam: boolean = false;
  isEvaluating: boolean = false;
  isUploadEvaluating: boolean = false;
  uploadedResults: Array<ResultItem> = new Array();
  camResults: Array<ResultItem> = new Array();
  score: Array<number> = [];
  color: ThemePalette = 'primary';
  mode: ProgressSpinnerMode = 'determinate';

  constructor(private cdr: ChangeDetectorRef){

  }

  ngAfterViewInit(){
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/assets/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models'),
      faceapi.nets.faceRecognitionNet.loadFromUri('/assets/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/assets/models'),
      faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/models'),
      faceapi.nets.mtcnn.loadFromUri('/assets/models')
    ]).then(this.startVideo.bind(this));
    // this.video.nativeElement.addEventListener('play', this.play.bind(this))
  }
  ngOnInit(){
  }
  
  startVideo() {
    navigator.getUserMedia(
      { video: {} },
      stream => {
        this.video.nativeElement.srcObject = stream;
      },
      err => console.error(err)
    )
  }
  upload($event: any){
    var reader = new FileReader();
    reader.onload = (event: any)=>{
        var img = new Image();
        img.onload = ()=>{
          let canvas: any = this.imageHolder.nativeElement;
          // canvas.width = img.width;
          // canvas.height = img.height;
          canvas.getContext("2d").drawImage(img,0,0, this.defaultWidth, this.defaultHeight);
        }
        img.src = event.target.result;
    }
    this.showWebCam = true;
    reader.readAsDataURL($event.target.files[0]);     
  }
  detectUploadFaces(){
    this.isUploadEvaluating = true;
    this.detectFaces(this.uploadedResults, ()=>{
      this.isUploadEvaluating = false;
      this.computeResult();
    });
  }
  detectCamFaces(){
    this.isEvaluating = true;
    this.snapshot();
    this.detectFaces(this.camResults, ()=> {
      let ctxfc: any = this.imageHolder.nativeElement.getContext("2d");
      ctxfc.textAlign = "center";
      ctxfc.fillStyle  = "#fff";
      ctxfc.font  = "14px";
      ctxfc.clearRect(0, 0, this.imageHolder.nativeElement.width, this.imageHolder.nativeElement.height);
      ctxfc.fillText("Choose Image", this.defaultWidth/2, this.defaultHeight/2);
      this.isEvaluating = false
    });
  }
  detectFaces(results: Array<any>, callback: Function){
    results.length = 0;
    let holder: any = this.imageHolder.nativeElement;
    faceapi.detectAllFaces(holder, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors()
      .run()
      .then(res=>{
        res.forEach((x, index)=>{
          const croppedImage = holder.getContext("2d").getImageData(x.detection.box.x, x.detection.box.y, x.detection.box.width , x.detection.box.height)
          let ctxfc: any = this.cropped.nativeElement.getContext("2d");
          this.cropped.nativeElement.width = x.detection.box.width;
          this.cropped.nativeElement.height = x.detection.box.height;
          ctxfc.clearRect(0, 0, this.cropped.nativeElement.width, this.cropped.nativeElement.height);
          ctxfc.beginPath();
          ctxfc.putImageData(croppedImage, 0, 0);
          let item: ResultItem = {
            name: `Person ${index+1}`,
            src: this.cropped.nativeElement.toDataURL("image/png"),
            descriptor: x
          }
          results.push(item);
          this.cdr.detectChanges();
        });
        callback(true);
      })
    
  }
  reset(){
    this.uploadedResults.length = 0;
    this.camResults.length = 0;
    this.showWebCam = false;
    this.startVideo()
  }

  async computeResult(){
    const maxDescriptorDistance = 0.6
    // let labels = await this.labeledDescriptor();
    let labels: any = [];
    this.camResults.forEach(x=>{
      const faceDescriptors = [x.descriptor.descriptor];
      labels.push(new faceapi.LabeledFaceDescriptors(x.name, faceDescriptors));
    })
    const faceMatcher = new faceapi.FaceMatcher(labels, maxDescriptorDistance);
    const results = this.uploadedResults.map(fd => faceMatcher.findBestMatch(fd.descriptor.descriptor))
    console.log(results);
    this.score.length = 0;
    results.forEach(x=>{
      this.score.push(x.distance);
    })
  }
  snapshot(){
    this.showWebCam = true;
    let el: any  = this.imageHolder.nativeElement;
    el.getContext('2d').drawImage(this.video.nativeElement, 0, 0, this.defaultWidth, this.defaultHeight);
    // this.base64Image = this.imageHolder.nativeElement.toDataURL("image/png"); //Convert image to 'octet-stream' (Just a download, really)
  }  
}
