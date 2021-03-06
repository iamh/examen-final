<template>
  <div>
    <div v-show="isCreating" class="modal-wrapper-spinner">
      <div class="modal">
        <clip-loader/>
      </div>
    </div>
    <div class="modal-wrapper-bg"  v-show="hidden">
      <div class="modal-buttons">
        <h4>Desea guardar los cambios?</h4>
        <div class="modal-footer">
          <button type="button" class="btn btn-danger" @click="onModal">Cancel</button>
          <button type="button" class="btn btn-danger" @click="onModify">Save changes</button>
        </div>
      </div>
    </div>
    <div v-show="animation" class="modal-wrapper-bg">
      <i class="icon-close material-icons" @click="isAnimation">close</i>
      <div class="flyin-grid">
        <div v-for="(img, key) in getPictures" :key="key" class="flyin-grid__item card">
          <img :src="img" class="imagen" />
        </div>
      </div>
    </div>
    <h2 class="title">Modify your workout</h2>
    <form>
      <input v-model="mode.workout.name" type="text" class="input" placeholder="Name it">
      <textarea v-model="mode.workout.description" type="text" class="input" placeholder="Describe it"></textarea>
      <div>
        <div v-if="!isImagen">
          <i :style="{color: !select ? 'grey' : 'red'}" class="icon-delete material-icons" @click="onSelect" title="Delete pictures" :disabled="selectProfile">delete</i>
          <i :style="{color: !selectProfile ? 'grey' : 'red'}" class="icon-profile material-icons" @click="onSelectProfile" title="Select profile picture" :disabled="select">face</i>
          <i v-if="!select && !selectProfile" class="icon-open material-icons" @click="isAnimation">open_with</i>
        </div>
        <div v-if="this.mode.workout.pictures" class="portfolio">
          <figure v-for="(imagen, key) in previewDisplayPaginated" :key="key" :class="key % 3 == 0 ? 'featured' : ''">
            <img :src="imagen" />
            <input v-if="select" :id="key" v-model="checked" :value="key" class="check" type="checkbox">
            <input v-if="selectProfile" :id="key" v-model="picked" :value="key" class="check" type="radio">
          </figure>
        </div>
        <workouts-pagination-component @loadMore="onLoadMore" :hasMore="hasMore"></workouts-pagination-component>
        <label class="title" for="imageFile">Relace the image</label>
        <input @change="previewFile($event.target.files)" type="file" :disabled="select || selectProfile" multiple class="form-control-file" ref="imageFile">
      </div>
      <div class="row">
        <div class="col">
          <button v-show="!isCreating" @click="onCancel" type="button" class="button button-primary">Cancel</button>
        </div>
        <div class="col">
          <button v-show="!isCreating" type="button" class="button button-primary" :disabled="this.mode.workout.name == '' || this.mode.workout.description == ''" @click="onModal">Apply</button>
        </div>
      </div>
    </form>
  </div>
</template>
<script>
  import {mapActions, mapGetters} from 'vuex'
  import ClipLoader from 'vue-spinner/src/ClipLoader.vue'
  import WorkoutsPaginationComponent from '~/components/workouts/WorkoutsPaginationComponent'
  
  export default {
    data () {
      return {
        pictures: [],
        firePictures: [],
        newPictures: [],
        auxPictures: [],
        aux: [],
        checked: [],
        picked: '',
        isCreating: false,
        hidden: false,
        select: false,
        selectProfile: false,
        isImagen: false,
        animation: false,
        pageImagenSize: 3,
        actualImageSize: 3
      }
    },
    components: {
      ClipLoader,
      WorkoutsPaginationComponent
    },
    computed: {
      ...mapGetters({mode: 'getMode'}),
      getPictures () {
        this.pictures = this.mode.workout.pictures.concat(this.newPictures)
        return this.pictures
      },
      previewDisplayPaginated () {
        return this.getPictures.slice(0, this.actualImageSize)
      },
      hasMore () {
        return this.getPictures.length > this.actualImageSize
      }
    },
    watch: {
      mode () {
        this.resetVars()
      }
    },
    methods: {
      ...mapActions(['modifyWorkout', 'setMode', 'deletePicture', 'uploadImages']),
      previewFile (files) {
        this.isImagen = true
        this.firePictures = [...files]
        for (let i = 0; i < event.target.files.length; i++) {
          var reader = new FileReader()
          reader.onload = (event) => {
            this.newPictures.push(event.target.result)
          }
          reader.readAsDataURL(event.target.files[i])
        }
      },
      onLoadMore () {
        this.actualImageSize += this.pageImagenSize
      },
      resetVars () {
        this.$refs.imageFile.value = null
        this.newPictures = []
        this.checked = []
        this.picked = ''
        this.isCreating = false
        this.select = false
        this.selectProfile = false
        this.animation = false
        this.isImagen = false
        this.hidden = false
        this.pageImagenSize = 3
        this.actualImageSize = 3
      },
      reset () {
        this.$emit('update:control', false)
        this.setMode({workout: null})
        this.resetVar()
      },
      isAnimation () {
        this.animation = !this.animation
      },
      onModal () {
        this.hidden = !this.hidden
      },
      onSelect () {
        if (!this.select) {
          this.select = true
          this.selectProfile = false
          this.picked = ''
        } else {
          this.select = false
          this.checked = []
        }
      },
      onSelectProfile () {
        if (!this.selectProfile) {
          this.selectProfile = true
          this.select = false
          this.checked = []
        } else {
          this.selectProfile = false
          this.picked = ''
        }
      },
      onCancel (ev) {
        ev.preventDefault()
        ev.stopPropagation()
        this.reset()
      },
     /* onDeletePic (key) {
        this.newPictures = []
        this.pictures = this.pictures.filter((value, index) => index !== key)
        this.mode.workout.pictures = this.pictures
      }, */
      onModify (ev) {
        this.hidden = false
        this.isCreating = true
        ev.preventDefault()
        ev.stopPropagation()
        if (this.checked.length > 0) {
          this.newPictures = []
          this.checked = this.checked.sort().reverse()
          for (let i = 0; i < this.checked.length; i++) {
            this.pictures = this.pictures.filter((value, index) => index !== this.checked[i])
          }
          this.mode.workout.pictures = this.pictures
        }
        if (this.picked !== '') {
          this.aux = this.pictures[this.picked]
          this.pictures[this.picked] = this.pictures[0]
          this.pictures[0] = this.aux
          this.mode.workout.pictures = this.pictures
        }
        for (let i = 0; i < this.pictures.length; i++) {
          if (this.mode.workout.pictures.includes(this.pictures[i])) {
            this.auxPictures.push(this.pictures[i])
          }
        }
        if (this.mode.workout.name.length > 0 && this.mode.workout.description.length > 0) {
          this.uploadImages(this.firePictures).then(picUrls => {
            this.modifyWorkout({
              workout: this.mode.workout,
              pictures: this.auxPictures.concat(picUrls)
            }).then(() => {
              this.reset()
            })
          }).then(() => {
            this.reset()
          })
        } else {
          this.isCreating = false
        }
      }
    }
  }
</script>
<style scoped lang="scss">
  .title {
    width: 100%;
  }
  .row {
    margin-top: 1em;
  }
  .button.button-primary:disabled {
    background-color: grey;
  }
  h4 {
    color: #4B8A08;
    font-weight: 800;
  }
  .check {
    position: absolute;
    margin: 10px 0 0 10px;
    cursor: pointer;
  }
  // icons //
  .icon-delete {
    position: absolute;
    margin: 0 0 0 -40px;
    cursor: pointer;
  }
  .icon-profile {
    position: absolute;
    margin: 30px 0 0 -40px;
    cursor: pointer;
    color: #CD5C5C;
  }
  .icon-open {
    position: absolute;
    cursor: pointer;
    margin: 60px 0 0 -40px;
    color: #17202A;
  }
  .icon-close {
    color: white;
    float: right;
    cursor: pointer;
    margin: 0.5em 0.5em 0 0;
  }
  // Spinner //
  .modal-wrapper-spinner {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    text-align: center;
    z-index: 99999999;
    background-color:rgba(0,0,0,.2)
  }
  .modal-wrapper-spinner:before {
    content: '';
    display: inline-block;
    height: 100%;
    vertical-align: middle;
  }
  .modal {
    position: relative;
    display: inline-block;
    vertical-align: middle;
    margin: 0 auto;    
  }
  // modal buttons //
  .modal-wrapper-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 99999999;
    background-color:rgba(0,0,0,.2)
  }
  .modal-buttons {
    position: relative;
    width: 30%;
    margin: 90px auto;
  }
  // grid img //
  .portfolio {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    grid-auto-rows: 1fr;
    grid-gap: 1em;
    grid-auto-flow: dense;
  }
  .portfolio .featured {
    grid-row: span 2;
    grid-column: span 2;
  }
  .portfolio > figure {
    display: flex;
    flex-direction: column;
    margin: 0;
  }
  .portfolio img {
    flex: 1; 
    object-fit: cover; 
    max-width: 100%;
  }
  // modal animation //
  .flyin-grid {
    width: 95%;
    margin: 1em auto;
    perspective: 500px;
  }
  .flyin-grid__item {
    animation: fly-in 600ms ease-in;
    animation-fill-mode: backwards;
  }
  .flyin-grid__item:nth-child(2) {
    animation-delay: 0.15s;
  }
  .flyin-grid__item:nth-child(3) {
    animation-delay: 0.3s;
  }
  .flyin-grid__item:nth-child(4) {
    animation-delay: 0.45s;
  }
  .card {
    margin-bottom: 1em;
    padding: 0.5em;
    background-color: #EAEDED;
    color: hsl(210, 15%, 20%);
    box-shadow: 0.2em 0.5em 1em rgba(0, 0, 0, 0.3);
  }
  .card > .imagen {
    width: 100%;
  }
  @keyframes fly-in {
    0% {
      transform: translateZ(-800px) rotateY(90deg);
      opacity: 0;
    }
    56% {
      transform: translateZ(-160px) rotateY(87deg);
      opacity: 1;
    }
    100% {
      transform: translateZ(0) rotateY(0);
    }
  }
  @media (min-width: 30em) {
    .flyin-grid {
      display: flex;
      flex-wrap: wrap;
      margin: 1em auto;
    }
    .flyin-grid__item {
      flex: 1 1 200px;
      margin-left: 0.5em;
      margin-right: 0.5em;
      max-width: 600px;
    }
  }
  @supports (display: grid) {
    .flyin-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      grid-gap: 2em;
    }
    .flyin-grid__item {
      max-width: initial;
      margin: 0;
    }
  }
</style>
