Below represents the format of the REST requests that the phone (of the ambulance driver) and the device (fixed to traffic signal ) need to send for the server to function properly.
### Phone check otp
    phone/checkotp:  (- MQTT Topic)
        input: (Plain text - each line seperated by '\n')
            {otp}\n
            {epoch}\n
            {topic}
            otp: The 3-digit code.
            epoch: Unix time in milliseconds.
            topic: The channel in which response is returned. (Optional if phone/topic is called before)
        output:
            if pass is valid:
                Thank You for Auth.
            else:
                Auth failed.

###  Phone change location
    phone/location:  (- MQTT Topic)
        input: (Plain text - each line seperated by '\n')
            {pass}\n
            {lat}\n
            {lng}\n
            {bear}\n
            {epoch}\n
            {topic}
            pass: The 3-digit code.
            lat: The latitude of current location.
            lng: The longitude of current location.
            bear: The direction of heading. (In degrees - 0 degree => east)
            epoch: Unix time in milliseconds.
            topic: The channel in which response is returned. (Optional)
        output: (if topic is passed)
            if pass is valid:
                Thank You for location.
            else:
                Auth failed.

### Device update topic
    device/topic:  (- MQTT Topic)
        input: (Plain text - each line seperated by '\n')
            {did}\n
            {epoch}\n
            {topic}
            pass: The 3-digit code.
            epoch: Unix time in milliseconds.
            topic: The channel in which response is returned.
        output:
            Thank You for your Topic.
    {topic}:  (- The given MQTT channel)
        output: (Plain text - each line seperated by '\n')
            {severity}\n
            {direction}\n
            {distance}
        
            severity == 0  => IGNORE
            severity == 1  =>  INCOMING (distance <= 1000 m)
                Might be a false alarm because it is difficult to predict direction.
            severity == 2  =>  NEARBY (distance <= 500 m)
                Direction might not be acurate.
            severity == 3  =>  CLOSE (distance <= 200 m)
            severity == 4  =>  ONSIGNAL (distance <= 100 m)
            
            Information in brackets might not be always true.

            direction: Integer from 1 to n.

            distance: Distance in meters.

### On HTTP -

### Display location
    /location/list:
        input: Nothing
        output:
            Location and direction of all online vechicles. (JSON)

### Show device status
    /device/list:
        input: Nothing.
        output:
            Status of all online devices. (JSON)
