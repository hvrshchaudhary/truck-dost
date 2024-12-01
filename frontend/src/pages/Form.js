import "./Form.css";

function Form() {
  return (
    <div className="container">
      <h1>Truck Dost</h1>
      <form className="form">
        <div className="form-group">
          <label htmlFor="firstname">First Name</label>
          <input
            type="text"
            placeholder="Enter First Name"
            name="firstname"
            id="firstname"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastname">Last Name</label>
          <input
            type="text"
            placeholder="Enter Last Name"
            name="lastname"
            id="lastname"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            placeholder="Enter Password"
            name="password"
            id="password"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            placeholder="Enter Email"
            name="email"
            id="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="contact">Contact</label>
          <input
            type="text"
            placeholder="Enter your Contact"
            name="contact"
            id="contact"
          />
        </div>

        <div className="form-group">
          <label htmlFor="truckcapacity">Truck Capacity</label>
          <input
            type="text"
            placeholder="Enter Truck Capacity"
            name="truckcapacity"
            id="truckcapacity"
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input type="date" name="date" id="date" />
        </div>

        <div className="form-buttons">
          <button type="reset" className="reset-btn">
            Reset
          </button>
          <button type="submit" className="submit-btn">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

export default Form;
