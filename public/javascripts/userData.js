export const getGeoJSON = () => {
    const users = window.usersData || [];
    return {
        type: "FeatureCollection",
        features: users.map(user => ({
            type: "Feature",
            geometry: user.geometry,
            properties: {
                popUpMarkup: `<strong><a href="/users/${user._id}">${user.fullName}</a></strong><p>${user.description ? user.description.substring(0, 20) : ''}...</p>`
            }
        }))
    };
};
