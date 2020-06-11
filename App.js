import React, {Component, useState} from 'react';
import { StyleSheet, Button, Text, TextInput, View, Dimensions, AsyncStorage, Modal } from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';

export default class App extends Component   {


    constructor(props) {
        super(props);

        this.state = {
            cargando: true,
            moviendose: false,
            coords: {
                latitude:0.0,
                longitude:0.0,
            },
            mensaje: '',
            id: null,
            esModal: false,
        }

    }

    async componentDidMount() {

        // BORRO LOS DATOS INICIALES
        // AsyncStorage.removeItem('USER_ID');
        // AsyncStorage.removeItem('USER_POSITION');


        // Verifico si tiene id de usuario
        try {
            const user = await AsyncStorage.getItem('USER_ID');

            if (user != null) {
                console.log('AsyncStorage.getItem("USER_ID") => ', user);

                // SI ESTA REGISTRADO
                await this.setState({id: user});

                let position = await AsyncStorage.getItem('USER_POSITION');
                console.log('position => ', JSON.parse(position) );

                if (position != null) {
                    console.log('AsyncStorage.getItem("USER_POSITION") => ',  JSON.parse(position));

                    // SI HAY POSICION GUARDADA
                    let {coords} = this.state;
                    coords.latitude= JSON.parse(position).latitude;
                    coords.longitude= JSON.parse(position).longitude;

                    // Actualizo posicion
                    await this.setState({coords});
                    await this.sendPosition();


                } else {

                    let location = await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
                    let {coords} = await this.state;
                    coords.latitude=location.coords.latitude;
                    coords.longitude=location.coords.longitude;
                    console.log('coords => ', coords);
                    AsyncStorage.setItem('USER_POSITION', JSON.stringify(coords) );

                    await this.setState({coords});
                    await this.sendPosition();


                }

                this.timer = setInterval(async ()=> {
                    if (!this.state.moviendose) {await this.sendPosition();}
                }, 6000);

            } else {
                // NO ESTA RESGISTRADO entonces muestro modal para registrar numero
                console.log('No existe');
                try {
                    this.toggleModal();
                } catch (error) {
                    // Error saving data
                }
            }

        } catch (error) {
            // Error retrieving data
        }



    }

    async sendPosition() {
        const {id} = await this.state;
        let {coords} = await this.state;

        // Enviar posicion al api
        await fetch(
            'http://xx.xx.xx.xx:xxxx/api/v1/tracking',
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                method: "POST",
                body: JSON.stringify({"userid": id, "position": {"latitude": coords.latitude, "longitude": coords.longitude}})
            }
        )
        .then(async (response) => await response.json())
        .then(async (responseJson) => {

            let coords = {
              latitude: responseJson.position.latitude,
              longitude: responseJson.position.longitude,
            };

            console.log('message => ', responseJson.message);
            // Solo actualizo si se movio el dispositivo
            if (responseJson.message=="MOVIENDOSE"){
                await this.setState({
                    id: id,
                    coords: coords,
                    mensaje: responseJson.message,
                });

            }

        })
        .catch((error) => {
            console.log('Error => ', error);
        });

    }

    async movementMarker(e) {

        // SI HAY POSICION GUARDADA
        let {coords} = await this.state;
        coords.latitude=e.coordinate.latitude;
        coords.longitude=e.coordinate.longitude;

        // Actualizo posicion
        await this.setState({coords});
        console.log('this.state.coords => ', this.state.coords);
        AsyncStorage.setItem('USER_POSITION', JSON.stringify(coords) );
        await this.sendPosition();
    }

    toggleModal = async () => {
        await this.setState({esModal: !this.state.esModal});
    }


    onChange = async (event) => {
        const {eventCount, target, text} = event.nativeEvent;
        await this.setState({id: text});
    };





    onRegistrarUsuario = async () => {
        const {id} = this.state;
        let {coords} = this.state;

        AsyncStorage.setItem('USER_ID', id);

        // Posicion inicial solo cuando se registra
        let { status } = await Location.requestPermissionsAsync();
        if (status !== 'granted') {
            alert('No tiene permiso para obtener posición del dispositivo');
        } else {
            let location = await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
            coords.latitude=location.coords.latitude;
            coords.longitude=location.coords.longitude;

            await this.setState({coords});
            AsyncStorage.setItem('USER_POSITION', coords);
            // await this.sendPosition();

        }

        await this.toggleModal();

        await this.componentDidMount();

    }



    onCancelar = () => {
        this.setState({cargando: false});
        this.toggleModal();
    }



    renderModal() {
        const {esModal, id} = this.state;
        return (
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={esModal}
                >
                    <View style={{ width: Dimensions.width, marginTop: 50, alignItems:'center', alignContent:'center', padding: 30, backgroundColor:'#fdef6b' }}>
                        <View style={{flexDirection:'column', alignContent: 'center', alignItems: 'center'}}>
                            <Text>Ingrese por favor su numero de celular</Text>
                            <TextInput
                                keyboardType='phone-pad'
                                maxLength={10}
                                onChange={ (evt) => {
                                    this.onChange(evt);
                                }}
                                value={this.state.id}
                                // this.onChangeText(text)
                            />


                            <View style={{flexDirection:'row', alignContent: 'center', alignItems: 'center', marginTop: 20}}>
                                <Button style={{width: 50, height:10}}
                                        title="Guardar"
                                        onPress={async () => {
                                                this.onRegistrarUsuario();
                                                // const {id} = this.state;
                                                // await AsyncStorage.setItem('USER_ID', id);
                                                // this.setState({cargando: false});
                                                // this.toggleModal();
                                                // // await this.componentDidMount();
                                            }
                                        }
                                />
                                <View style={{width:10}} />
                                <Button style={{width: 50}}
                                        title="Cancelar"
                                        onPress={
                                            this.onCancelar
                                        }
                                />

                            </View>

                        </View>
                    </View>

                </Modal>

        )
    }

    renderMarcador() {
        const {coords, id} = this.state;
        const title = `Dispositivo #: ${id}`;
        return (
            <MapView.Marker
                draggable
                key={id}
                coordinate={{
                    latitude: coords?.latitude,
                    longitude: coords?.longitude,
                }}
                title={title}
                onDragEnd={e => this.movementMarker(e.nativeEvent)}
                // description={metadata}
            />
        )

    }


    render() {
        const {coords} = this.state;

        return (
            <View style={styles.container}>
                <MapView
                    style={styles.mapStyle}
                    region={{
                        latitude: coords?.latitude,
                        longitude: coords?.longitude,
                        latitudeDelta: 0.0452,
                        longitudeDelta: 0.0221
                    }}
                >
                    {(coords.latitude==null || coords.longitude==null) ? null : this.renderMarcador()}
                </MapView>
                {this.renderModal()}

            </View>
        );
    }


}

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapStyle: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
});