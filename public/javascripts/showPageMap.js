document.addEventListener("DOMContentLoaded", () => {
    if (!user.geometry || !user.geometry.coordinates) return;

    const map = new maptilersdk.Map({
        container: 'map',
        style: maptilersdk.MapStyle.STREETS,
        center: user.geometry.coordinates,
        zoom: 10,
        apiKey: maptilerApiKey
    });
    console.log(user.geometry.coordinates);
    new maptilersdk.Marker()
        .setLngLat(user.geometry.coordinates)
        .addTo(map);
});
