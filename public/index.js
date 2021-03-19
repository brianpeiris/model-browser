import * as THREE from "./node_modules/three/build/three.module.js";
import { GLTFLoader } from "./node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "./node_modules/three/examples/jsm/controls/OrbitControls.js";
import { Sky } from "./node_modules/three/examples/jsm/objects/Sky.js";
import "./node_modules/react/umd/react.production.min.js";
import "./node_modules/react-dom/umd/react-dom.production.min.js";

const React = window.React;
const ReactDOM = window.ReactDOM;
const el = React.createElement;
const { useState, useEffect, useRef, useCallback } = React;

const query = new URLSearchParams(location.search);
const flip = query.get("flip") !== null;

function generateEnvironmentMap(sky, renderer) {
  const skyScene = new THREE.Scene();
  skyScene.add(sky);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const renderTarget = pmremGenerator.fromScene(skyScene);
  pmremGenerator.dispose();

  skyScene.remove(sky);

  return renderTarget.texture;
}

function createSky(lightPosition) {
  const sky = new Sky();
  sky.scale.setScalar(450000);

  const uniforms = sky.material.uniforms;
  uniforms["turbidity"].value = 0.4;
  uniforms["rayleigh"].value = 4;
  uniforms["mieCoefficient"].value = 0.05;
  uniforms["mieDirectionalG"].value = 0.95;
  uniforms["sunPosition"].value.copy(lightPosition);

  return sky;
}

function setupThree(backgroundColor) {
  const scene = new THREE.Scene();

  scene.add(new THREE.AmbientLight(0x333333));

  const light = new THREE.DirectionalLight(0x888888);
  scene.add(light);

  const model = new THREE.Group();
  scene.add(model);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(backgroundColor);

  if (flip) {
    light.position.set(1, 2, -3);
  } else {
    light.position.set(1, 2, 3);
  }

  const sky = createSky(light.position);
  const envMap = generateEnvironmentMap(sky, renderer);

  const camera = new THREE.OrthographicCamera();
  camera.near = 0;
  camera.far = 100;

  if (flip) {
    camera.position.set(1, 1, -1);
  } else {
    camera.position.set(1, 1, 1);
  }

  camera.lookAt(new THREE.Vector3());

  const size = 200;
  renderer.setSize(size, size);
  camera.aspect = size / size;
  camera.updateProjectionMatrix();

  const loader = new GLTFLoader();

  return { renderer, scene, envMap, camera, model, loader };
}

function addGltf(gltfScene, group, envMap, camera) {
  gltfScene.traverse((obj) => {
    if (!obj.material) return;
    obj.material.envMap = envMap;
    obj.material.envMapIntensity = 0.3;
  });

  const box = new THREE.Box3();
  box.setFromObject(gltfScene);
  let size = new THREE.Vector3();
  box.getSize(size);
  let maxSize = Math.max(size.x, size.y, size.z);

  if (maxSize > 2) {
    gltfScene.scale.setScalar(1 / maxSize);
    box.setFromObject(gltfScene);
    box.getSize(size);
    maxSize = Math.max(size.x, size.y, size.z);
  }

  const center = new THREE.Vector3();
  box.getCenter(center);
  gltfScene.position.sub(center);

  group.clear();
  group.add(gltfScene);

  camera.top = maxSize;
  camera.right = maxSize;
  camera.bottom = -maxSize;
  camera.left = -maxSize;

  camera.updateProjectionMatrix();
}

const recentCache = [];
function loadFile(loader, file) {
  const cached = recentCache.find(entry => entry.file === file);
  if (cached) return Promise.resolve(cached.gltf);
  return new Promise((resolve, reject) =>
    loader.load(`/files/${file}`, gltf => {
      recentCache.push({file, gltf});
      if (recentCache.length > 10) recentCache.shift();
      resolve(gltf);
    }, null, reject)
  );
}

const renderThumbnail = (() => {
  const { renderer, scene, envMap, camera, model, loader } = setupThree("#444");

  async function renderThumbnail(file) {
    const gltf = await loadFile(loader, file);
    addGltf(gltf.scene, model, envMap, camera);

    renderer.render(scene, camera);
    return renderer.domElement.toDataURL();
  }

  return renderThumbnail;
})();

function getName(name) {
  if (!name) return;
  if (name.includes("/")) {
    return name.substring(name.lastIndexOf("/") + 1);
  } else {
    return name.substring(name.lastIndexOf("\\") + 1);
  }
}

function Thumbnail({ file, onPointerMove, onPointerDown }) {
  const name = file.file;

  /*
  const [dataURL, setDataURL] = useState();

  useEffect(() => {
    fetch(`/files/${file.file}`)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          setDataURL(reader.result);
        };
        reader.readAsDataURL(blob);
      });
  }, [file]);
  */

  return el(
    "div",
    { className: "thumbnail" },
    el("img", {
      draggable: false,
      src: file.thumbnail,
      onPointerMove,
      onPointerDown,
    }),
    el("a", { title: name, href: `/files/${file.file}` }, getName(name))
  );
}

function Model({ elem, file, onMouseLeave }) {
  const modelDiv = useRef();
  const modelGroup = useRef();
  const gltfLoader = useRef();
  const cameraObj = useRef();
  const envMapRef = useRef();
  const controls = useRef();
  const render = useRef();
  const fileUrl = useRef();
  const [style, setStyle] = useState({ top: 0, left: 0 });

  useEffect(async () => {
    const { renderer, scene, envMap, camera, model, loader } = setupThree("#555");

    modelGroup.current = model;
    gltfLoader.current = loader;
    cameraObj.current = camera;
    envMapRef.current = envMap;

    modelDiv.current.append(renderer.domElement);

    controls.current = new OrbitControls(camera, renderer.domElement);

    render.current = () => {
      renderer.render(scene, camera);
    };

    controls.current.addEventListener("change", render.current);
  }, [modelDiv]);

  useEffect(async () => {
    setStyle((style) => ({ ...style, display: "none" }));

    if (!file) return;

    fileUrl.current = file.file;

    controls.current.reset();

    const gltf = await loadFile(gltfLoader.current, file.file);

    if(file.file !== fileUrl.current) return;

    addGltf(gltf.scene, modelGroup.current, envMapRef.current, cameraObj.current);

    render.current();

    const setPosition = () => {
      if (!elem) return;
      const rect = elem.getClientRects()[0];
      if (!rect) return;
      setStyle((style) => ({ ...style, top: rect.top, left: rect.left }));
    };

    setPosition();

    setStyle((style) => ({ ...style, display: "block" }));

    window.addEventListener("loaded-file", setPosition);
    window.addEventListener("resize", setPosition);
    window.addEventListener("thumbnails-scroll", setPosition);

    return () => {
      window.removeEventListener("loaded-file", setPosition);
      window.removeEventListener("resize", setPosition);
      window.removeEventListener("thumbnails-scroll", setPosition);
    };
  }, [elem, file]);

  return el("div", { ref: modelDiv, className: "model", style, onMouseLeave });
}

function App() {
  const [basePath, setBasePath] = useState();
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState();
  const [progress, setProgress] = useState();
  const [previewThumbnail, setPreviewThumbnail] = useState();
  const [previewFile, setPreviewFile] = useState();

  useEffect(() => {
    fetch(`/files`)
      .then((r) => r.json())
      .then(async ({ basePath, files }) => {
        setBasePath(basePath);
        const results = [];
        //files = files.filter((f) => f.includes("")).slice(0);
        setProgress({ num: 0, total: files.length });
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          const thumbnail = await renderThumbnail(file);
          results.push({ file, thumbnail });
          setFiles(results.slice(0));

          setProgress({ num: i + 1, total: files.length });

          window.dispatchEvent(new CustomEvent("loaded-file"));
        }
      });
  }, []);

  const clearPreviewModel = useCallback(() => {
    setPreviewThumbnail(null);
    setPreviewFile(null);
  }, [setPreviewThumbnail, setPreviewFile]);

  const previewModel = useCallback(
    (thumbnail, file) => {
      setPreviewThumbnail(thumbnail);
      setPreviewFile(file);
    },
    [setPreviewThumbnail, setPreviewFile]
  );

  const finishedLoading = progress && progress.num === progress.total;
  const noFiles = progress && progress.total === 0;

  const filteredFiles = files.filter(
    (file) =>
      !filter ||
      getName(file.file)?.toLowerCase().includes(filter.toLowerCase())
  );

  const formattedBasePath = basePath
    ?.trim()
    .replace(/^[/\\]/, "")
    .replace(/[/\\]/g, " > ");

  return el(
    React.Fragment,
    {},
    el("h1", {}, "model-browser"),
    el("h2", {}, formattedBasePath),
    el("input", {
      type: "search",
      placeholder: "filter",
      value: filter,
      onChange: (e) => {
        clearPreviewModel();
        setFilter(e.target.value);
      },
    }),
    !finishedLoading &&
      el(
        "span",
        { className: "loading" },
        progress && `loading ${progress.num}/${progress.total}`
      ),
    finishedLoading &&
      noFiles &&
      el("span", { className: "loading" }, `no files found`),
    el(
      "div",
      {
        className: "thumbnails",
        onPointerDown: (e) =>
          e.currentTarget === e.target && clearPreviewModel(),
        onContextMenu: (e) => e.preventDefault(),
        onScroll: () =>
          window.dispatchEvent(new CustomEvent("thumbnails-scroll")),
      },
      filteredFiles.map((file) =>
        el(Thumbnail, {
          key: file.file,
          file,
          onPointerMove: (e) =>
            e.buttons === 0 && previewModel(e.currentTarget, file),
          onPointerDown: (e) => previewModel(e.currentTarget, file),
        })
      )
    ),
    el(Model, {
      elem: previewThumbnail,
      file: previewFile,
      onMouseLeave: (e) => e.buttons === 0 && clearPreviewModel(),
    })
  );
}

ReactDOM.render(el(App), document.getElementById("root"));
